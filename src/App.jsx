import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Minus, ChevronLeft, ChevronRight, X, Check, MessageSquarePlus, MessageSquareText, History, Trash2, Eye, User, LogOut, WifiOff, UtensilsCrossed, Wine, Flame, Cigarette, Sparkles, Coffee, Package, Wrench, ShoppingBag, Beer, IceCream, Gift, Menu as MenuIcon } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  getCachedRestaurantId,
  setCachedRestaurantId,
  fetchRestaurantByPin,
  fetchRestaurantById,
} from "./restaurant";

// Набор доступных иконок для рубрик — ключ "icon" в menus/<id>.json должен быть
// одним из этих слов. Если указано что-то другое или иконка не указана —
// используется значок по умолчанию (MenuIcon).
const CATEGORY_ICONS = {
  utensils: UtensilsCrossed,
  wine: Wine,
  flame: Flame,
  cigarette: Cigarette,
  sparkles: Sparkles,
  coffee: Coffee,
  package: Package,
  wrench: Wrench,
  "shopping-bag": ShoppingBag,
  beer: Beer,
  "ice-cream": IceCream,
  gift: Gift,
};
const getCategoryIcon = (iconKey) => CATEGORY_ICONS[iconKey] || MenuIcon;

const WAITER_NAMES = ["Официант 1", "Официант 2", "Официант 3", "Официант 4"];
const POLL_INTERVAL = 5000; // мс — как часто подтягивать заказы других официантов

// Карточка всегда одной высоты — это то, что делает расчет страниц предсказуемым
const CARD_H = 132; // px, высота карточки блюда
const MIN_CARD_W = 148; // px, минимальная ширина карточки
const GRID_GAP = 10; // px, зазор между карточками

function OrderScreen({
  waiterName,
  onSwitchWaiter,
  restaurantId,
  restaurantName,
  categories,
  items: menuItems,
}) {
  const [category, setCategory] = useState(categories[0]?.id || "food");
  const [tableNumber, setTableNumber] = useState(1);
  const [page, setPage] = useState(0);
  const [qty, setQty] = useState({});
  const [comments, setComments] = useState({});
  const [commentDraft, setCommentDraft] = useState("");
  const [editingComment, setEditingComment] = useState(null); // id блюда, для которого открыт ввод
  const [showSummary, setShowSummary] = useState(false);
  const [sent, setSent] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [ordersTab, setOrdersTab] = useState("active"); // "active" | "done"
  const [allActiveOrders, setAllActiveOrders] = useState([]); // активные ВСЕХ официантов (нужно для блокировки стола)
  const [orderHistory, setOrderHistory] = useState([]); // история — общая на всех
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Только СВОИ активные заказы этот официант видит в списке "Активные"
  const activeOrders = useMemo(
    () => allActiveOrders.filter((o) => o.waiter === waiterName),
    [allActiveOrders, waiterName]
  );

  // --- Общая база данных (Supabase): активные заказы + история, видны всем официантам ---
  // Черновик текущего набираемого заказа остается локальным на устройстве — свой у каждого официанта
  const DRAFT_KEY = `waiter-draft-${waiterName}`;

  const mapRow = (row) => ({
    id: row.id,
    table: row.table_number,
    waiter: row.waiter,
    date: row.created_at,
    completedDate: row.completed_at,
    itemsCount: row.items_count,
    total: row.total,
    items: row.items || [],
  });

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    if (error) {
      setOrdersError(error.message);
      return;
    }
    setOrdersError(null);
    const rows = (data || []).map(mapRow);
    setAllActiveOrders(rows.filter((r) => !r.completedDate));
    setOrderHistory(rows.filter((r) => r.completedDate));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchOrders();
      if (!cancelled) setOrdersLoading(false);
    })();
    // Периодически подтягиваем заказы других официантов
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Черновик (еще не отправленный заказ) — грузим и сохраняем локально, отдельно на каждого официанта
  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem(DRAFT_KEY);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft.category) setCategory(draft.category);
        if (typeof draft.tableNumber === "number")
          setTableNumber(draft.tableNumber);
        if (typeof draft.page === "number") setPage(draft.page);
        if (draft.qty) setQty(draft.qty);
        if (draft.comments) setComments(draft.comments);
      }
    } catch (e) {
      console.error("Не удалось прочитать черновик заказа", e);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ category, tableNumber, page, qty, comments })
        );
      } catch (e) {
        console.error("Не удалось сохранить черновик заказа", e);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [category, tableNumber, page, qty, comments, draftLoaded]);

  // Новый заказ отправлен — становится активным (виден только этому официанту) и блокирует стол для всех
  const addActiveOrder = async (entry) => {
    const optimistic = { ...entry, waiter: waiterName };
    setAllActiveOrders((prev) => [optimistic, ...prev]);
    if (!supabase) return;
    const { error } = await supabase.from("orders").insert([
      {
        id: entry.id,
        restaurant_id: restaurantId,
        waiter: waiterName,
        table_number: entry.table,
        items: entry.items,
        items_count: entry.itemsCount,
        total: entry.total,
        created_at: entry.date,
      },
    ]);
    if (error) setOrdersError(error.message);
    fetchOrders();
  };

  // Заказ выполнен — уходит из активных в общую историю, стол освобождается
  const completeOrder = async (id) => {
    const order = allActiveOrders.find((e) => e.id === id);
    const completedDate = new Date().toISOString();
    setAllActiveOrders((prev) => prev.filter((e) => e.id !== id));
    if (order) {
      setOrderHistory((prev) => [{ ...order, completedDate }, ...prev]);
    }
    if (!supabase) return;
    const { error } = await supabase
      .from("orders")
      .update({ completed_at: completedDate })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) setOrdersError(error.message);
    fetchOrders();
  };

  // Отмена активного заказа без выполнения — освобождает стол, в историю не идет
  const cancelActiveOrder = async (id) => {
    setAllActiveOrders((prev) => prev.filter((e) => e.id !== id));
    if (!supabase) return;
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (error) setOrdersError(error.message);
  };

  const [viewingOrder, setViewingOrder] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(null); // заказ, который собираются отменить

  // --- Адаптивная сетка: считаем, сколько карточек влезает без скролла ---
  const gridRef = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () =>
      setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const { columns, rows, pageSize } = useMemo(() => {
    if (!box.width || !box.height) {
      return { columns: 2, rows: 5, pageSize: 10 };
    }
    const cols = Math.max(
      1,
      Math.floor((box.width + GRID_GAP) / (MIN_CARD_W + GRID_GAP))
    );
    const rws = Math.max(
      1,
      Math.floor((box.height + GRID_GAP) / (CARD_H + GRID_GAP))
    );
    return { columns: cols, rows: rws, pageSize: cols * rws };
  }, [box]);

  const items = menuItems.filter((i) => i.category === category);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Если после смены ориентации/размера текущая страница вышла за пределы — подрезаем
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  const pageItems = useMemo(
    () => items.slice(page * pageSize, page * pageSize + pageSize),
    [items, page, pageSize]
  );

  const allItemsById = useMemo(() => {
    const map = {};
    [...FOOD, ...BAR].forEach((i) => (map[i.id] = i));
    return map;
  }, []);

  const totalCount = Object.values(qty).reduce((a, b) => a + b, 0);
  const totalSum = Object.entries(qty).reduce(
    (sum, [id, n]) => sum + (allItemsById[id]?.price || 0) * n,
    0
  );

  const changeQty = (id, delta) => {
    setQty((prev) => {
      const next = { ...prev };
      const current = next[id] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) delete next[id];
      else next[id] = updated;
      return next;
    });
  };

  const switchCategory = (cat) => {
    setCategory(cat);
    setPage(0);
  };

  const changeTable = (delta) => {
    setTableNumber((n) => Math.min(99, Math.max(1, n + delta)));
  };

  const openComment = (item) => {
    setCommentDraft(comments[item.id] || "");
    setEditingComment(item);
  };

  const saveComment = () => {
    setComments((prev) => {
      const next = { ...prev };
      const text = commentDraft.trim();
      if (text) next[editingComment.id] = text;
      else delete next[editingComment.id];
      return next;
    });
    setEditingComment(null);
  };

  const quickComments = ["Без лука", "Острое", "Без специй", "Срочно", "Отдельно"];

  const selectedList = Object.entries(qty)
    .map(([id, n]) => ({ ...allItemsById[id], n }))
    .filter((i) => i.n > 0);

  const money = (n) => n.toLocaleString("ru-RU");

  // Стол считается занятым, если по нему есть активный (еще не выполненный) заказ
  // У ЛЮБОГО официанта — повторно оформить заказ на него нельзя, пока его не выполнят или не отменят
  const activeTableEntry = allActiveOrders.find((e) => e.table === tableNumber);
  const isTableLocked = Boolean(activeTableEntry);

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.restaurantLabel}>{restaurantName}</div>
        <div style={styles.headerTop}>
          <div style={styles.headerLeft}>
            <div
              style={{
                ...styles.tableStepper,
                ...(isTableLocked ? styles.tableStepperLocked : {}),
              }}
            >
              <span style={styles.tableLabel}>СТОЛ</span>
              <button
                style={styles.tableBtn}
                onClick={() => changeTable(-1)}
                aria-label="Предыдущий стол"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span
                style={{
                  ...styles.tableNum,
                  ...(isTableLocked ? styles.tableNumLocked : {}),
                }}
              >
                №{tableNumber}
              </span>
              <button
                style={styles.tableBtn}
                onClick={() => changeTable(1)}
                aria-label="Следующий стол"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            <button
              style={styles.historyBtn}
              onClick={() => setShowOrders(true)}
              aria-label="Заказы"
            >
              <History size={16} strokeWidth={2.2} />
              {activeOrders.length > 0 && (
                <span style={styles.historyBadge}>{activeOrders.length}</span>
              )}
            </button>
          </div>
          <span style={styles.pageIndicator}>
            {page + 1} / {pageCount}
          </span>
        </div>
        <div style={styles.waiterRow}>
          <div style={styles.waiterBadge}>
            <User size={13} strokeWidth={2.4} />
            {waiterName}
          </div>
          <div style={styles.waiterRowRight}>
            {ordersError && (
              <span style={styles.syncWarning} title={ordersError}>
                <WifiOff size={13} strokeWidth={2.2} />
                нет связи с базой
              </span>
            )}
            <button style={styles.switchWaiterBtn} onClick={onSwitchWaiter}>
              <LogOut size={13} strokeWidth={2.2} />
              Сменить
            </button>
          </div>
        </div>
        <div style={styles.tabs}>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <button
                key={cat.id}
                style={{
                  ...styles.tab,
                  ...(category === cat.id ? styles.tabActive : {}),
                }}
                onClick={() => switchCategory(cat.id)}
              >
                <Icon size={18} strokeWidth={2.2} />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={styles.gridWrap}>
        <div
          ref={gridRef}
          style={{
            ...styles.grid,
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridAutoRows: `${CARD_H}px`,
          }}
        >
          {pageItems.map((item) => {
            const n = qty[item.id] || 0;
            return (
              <div
                key={item.id}
                style={{
                  ...styles.card,
                  ...(n > 0 ? styles.cardActive : {}),
                }}
              >
                <div style={styles.cardTop}>
                  <div style={styles.cardNameRow}>
                    <div style={styles.cardName}>{item.name}</div>
                    <button
                      style={{
                        ...styles.commentBtn,
                        ...(comments[item.id] ? styles.commentBtnActive : {}),
                      }}
                      onClick={() => openComment(item)}
                      aria-label={`Комментарий к ${item.name}`}
                    >
                      {comments[item.id] ? (
                        <MessageSquareText size={15} strokeWidth={2.2} />
                      ) : (
                        <MessageSquarePlus size={15} strokeWidth={2.2} />
                      )}
                    </button>
                  </div>
                  {comments[item.id] && (
                    <div style={styles.cardComment}>{comments[item.id]}</div>
                  )}
                  <div style={styles.cardPrice}>{money(item.price)} ₽</div>
                </div>
                <div style={styles.stepper}>
                  <button
                    style={{
                      ...styles.stepBtn,
                      opacity: n === 0 ? 0.35 : 1,
                    }}
                    onClick={() => changeQty(item.id, -1)}
                    disabled={n === 0}
                    aria-label={`Убрать ${item.name}`}
                  >
                    <Minus size={16} strokeWidth={3} />
                  </button>
                  <span style={styles.stepNum}>{n}</span>
                  <button
                    style={styles.stepBtn}
                    onClick={() => changeQty(item.id, 1)}
                    aria-label={`Добавить ${item.name}`}
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={styles.pager}>
          <button
            style={{ ...styles.pagerBtn, opacity: page === 0 ? 0.3 : 1 }}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={22} />
          </button>
          <div style={styles.dots}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  ...styles.dot,
                  ...(i === page ? styles.dotActive : {}),
                }}
                aria-label={`Страница ${i + 1}`}
              />
            ))}
          </div>
          <button
            style={{
              ...styles.pagerBtn,
              opacity: page === pageCount - 1 ? 0.3 : 1,
            }}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Bottom confirm bar */}
      {isTableLocked && (
        <div style={styles.lockWarning}>
          Стол №{tableNumber} уже занят активным заказом
          {activeTableEntry?.waiter && activeTableEntry.waiter !== waiterName
            ? ` (${activeTableEntry.waiter})`
            : ""}{" "}
          — его нужно выполнить или отменить, чтобы оформить новый
        </div>
      )}
      <div style={styles.footer}>
        <div style={styles.footerInfo}>
          <span style={styles.footerCount}>{totalCount} поз.</span>
          <span style={styles.footerSum}>{money(totalSum)} ₽</span>
        </div>
        <button
          style={{
            ...styles.confirmBtn,
            ...(totalCount === 0 || isTableLocked
              ? styles.confirmBtnDisabled
              : {}),
          }}
          disabled={totalCount === 0 || isTableLocked}
          onClick={() => setShowSummary(true)}
        >
          {isTableLocked ? "Стол занят" : "Подтвердить заказ"}
        </button>
      </div>

      {/* Comment modal */}
      {editingComment && (
        <div style={styles.modalOverlay} onClick={() => setEditingComment(null)}>
          <div style={styles.commentModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>{editingComment.name}</span>
              <button
                style={styles.closeBtn}
                onClick={() => setEditingComment(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.quickRow}>
              {quickComments.map((q) => (
                <button
                  key={q}
                  style={{
                    ...styles.quickChip,
                    ...(commentDraft === q ? styles.quickChipActive : {}),
                  }}
                  onClick={() =>
                    setCommentDraft((prev) => (prev === q ? "" : q))
                  }
                >
                  {q}
                </button>
              ))}
            </div>

            <textarea
              style={styles.commentInput}
              placeholder="Например: без лука, отдельно от заказа..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={3}
              autoFocus
            />

            <button style={styles.sendBtn} onClick={saveComment}>
              <Check size={18} strokeWidth={2.5} />
              Сохранить комментарий
            </button>
          </div>
        </div>
      )}

      {/* Orders modal: активные заказы + история выполненных */}
      {showOrders && (
        <div style={styles.modalOverlay} onClick={() => setShowOrders(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Заказы</span>
              <button
                style={styles.closeBtn}
                onClick={() => setShowOrders(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.ordersTabs}>
              <button
                style={{
                  ...styles.ordersTab,
                  ...(ordersTab === "active" ? styles.ordersTabActive : {}),
                }}
                onClick={() => setOrdersTab("active")}
              >
                Активные{activeOrders.length > 0 ? ` (${activeOrders.length})` : ""}
              </button>
              <button
                style={{
                  ...styles.ordersTab,
                  ...(ordersTab === "done" ? styles.ordersTabActive : {}),
                }}
                onClick={() => setOrdersTab("done")}
              >
                История
              </button>
            </div>

            {ordersLoading ? (
              <p style={styles.historyEmpty}>Загрузка...</p>
            ) : ordersTab === "active" ? (
              activeOrders.length === 0 ? (
                <p style={styles.historyEmpty}>
                  Активных заказов нет. Они появляются здесь после отправки
                  заказа и блокируют стол до выполнения.
                </p>
              ) : (
                <div style={styles.modalList}>
                  {activeOrders.map((entry) => (
                    <div key={entry.id} style={styles.historyRow}>
                      <button
                        style={styles.historyRowMain}
                        onClick={() => setViewingOrder(entry)}
                      >
                        <span style={styles.historyTable}>
                          Стол №{entry.table}
                        </span>
                        <span style={styles.historyMeta}>
                          {formatDate(entry.date)} · {entry.itemsCount} поз. ·{" "}
                          {money(entry.total)} ₽
                        </span>
                      </button>
                      <button
                        style={styles.eyeBtn}
                        onClick={() => setViewingOrder(entry)}
                        aria-label={`Состав заказа стола ${entry.table}`}
                      >
                        <Eye size={17} strokeWidth={2.2} />
                      </button>
                      <button
                        style={styles.completeBtn}
                        onClick={() => completeOrder(entry.id)}
                        aria-label={`Выполнить заказ стола ${entry.table}`}
                      >
                        <Check size={17} strokeWidth={2.4} />
                      </button>
                      <button
                        style={styles.historyDeleteBtn}
                        onClick={() => setConfirmingCancel(entry)}
                        aria-label={`Отменить заказ стола ${entry.table}`}
                      >
                        <Trash2 size={17} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : orderHistory.length === 0 ? (
              <p style={styles.historyEmpty}>
                Пока пусто. Заказы попадают сюда после выполнения.
              </p>
            ) : (
              <div style={styles.modalList}>
                {orderHistory.map((entry) => (
                  <div key={entry.id} style={styles.historyRow}>
                    <button
                      style={styles.historyRowMain}
                      onClick={() => setViewingOrder(entry)}
                    >
                      <span style={styles.historyTable}>
                        Стол №{entry.table}
                      </span>
                      <span style={styles.historyMeta}>
                        {formatDate(entry.completedDate || entry.date)} ·{" "}
                        {entry.itemsCount} поз. · {money(entry.total)} ₽
                      </span>
                      {entry.waiter && (
                        <span style={styles.historyWaiter}>
                          {entry.waiter}
                        </span>
                      )}
                    </button>
                    <button
                      style={styles.eyeBtn}
                      onClick={() => setViewingOrder(entry)}
                      aria-label={`Состав заказа стола ${entry.table}`}
                    >
                      <Eye size={17} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm cancel modal */}
      {confirmingCancel && (
        <div
          style={{ ...styles.modalOverlay, alignItems: "center" }}
          onClick={() => setConfirmingCancel(null)}
        >
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmIcon}>
              <Trash2 size={22} strokeWidth={2.2} />
            </div>
            <div style={styles.confirmTitle}>
              Отменить заказ стола №{confirmingCancel.table}?
            </div>
            <div style={styles.confirmText}>
              {confirmingCancel.itemsCount} поз. на{" "}
              {money(confirmingCancel.total)} ₽ будут удалены без выполнения.
              Это действие нельзя отменить.
            </div>
            <div style={styles.confirmActions}>
              <button
                style={styles.confirmCancelBtn}
                onClick={() => setConfirmingCancel(null)}
              >
                Оставить
              </button>
              <button
                style={styles.confirmDeleteBtn}
                onClick={() => {
                  cancelActiveOrder(confirmingCancel.id);
                  setConfirmingCancel(null);
                }}
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order detail modal — состав конкретного заказа */}
      {viewingOrder && (
        <div style={styles.modalOverlay} onClick={() => setViewingOrder(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>
                  Стол №{viewingOrder.table}
                </div>
                <div style={styles.historyMeta}>
                  {formatDate(viewingOrder.completedDate || viewingOrder.date)}
                  {viewingOrder.waiter ? ` · ${viewingOrder.waiter}` : ""}
                </div>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setViewingOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalList}>
              {(viewingOrder.items || []).map((i) => (
                <div key={i.id} style={styles.modalRowWrap}>
                  <div style={styles.modalRow}>
                    <span style={styles.modalRowQty}>{i.n}×</span>
                    <span style={styles.modalRowName}>{i.name}</span>
                    <span style={styles.modalRowPrice}>
                      {money(i.price * i.n)} ₽
                    </span>
                  </div>
                  {i.comment && (
                    <div style={styles.modalRowComment}>💬 {i.comment}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={styles.modalTotal}>
              <span>Итого</span>
              <span>{money(viewingOrder.total)} ₽</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary modal */}
      {showSummary && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {sent ? "Заказ отправлен" : "Проверьте заказ"}
              </span>
              <button
                style={styles.closeBtn}
                onClick={() => {
                  setShowSummary(false);
                  setSent(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!sent ? (
              <>
                <div style={styles.modalList}>
                  {selectedList.map((i) => (
                    <div key={i.id} style={styles.modalRowWrap}>
                      <div style={styles.modalRow}>
                        <span style={styles.modalRowQty}>{i.n}×</span>
                        <span style={styles.modalRowName}>{i.name}</span>
                        <span style={styles.modalRowPrice}>
                          {money(i.price * i.n)} ₽
                        </span>
                      </div>
                      {comments[i.id] && (
                        <div style={styles.modalRowComment}>
                          💬 {comments[i.id]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={styles.modalTotal}>
                  <span>Итого</span>
                  <span>{money(totalSum)} ₽</span>
                </div>
                <button
                  style={styles.sendBtn}
                  onClick={() => {
                    addActiveOrder({
                      id: `${Date.now()}`,
                      table: tableNumber,
                      date: new Date().toISOString(),
                      itemsCount: totalCount,
                      total: totalSum,
                      items: selectedList.map((i) => ({
                        id: i.id,
                        name: i.name,
                        price: i.price,
                        n: i.n,
                        comment: comments[i.id] || null,
                      })),
                    });
                    setSent(true);
                  }}
                >
                  <Check size={18} strokeWidth={2.5} />
                  Отправить на кухню/бар
                </button>
              </>
            ) : (
              <div style={styles.sentBox}>
                <div style={styles.sentIcon}>
                  <Check size={28} strokeWidth={3} />
                </div>
                <p style={styles.sentText}>
                  Заказ на {totalCount} позиций передан. Стол №{tableNumber}.
                </p>
                <button
                  style={styles.newOrderBtn}
                  onClick={() => {
                    setQty({});
                    setShowSummary(false);
                    setSent(false);
                  }}
                >
                  Новый заказ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Обертка: настройка Supabase → выбор официанта → сам экран заказа --------

function SetupNotice() {
  return (
    <div style={wrapperStyles.center}>
      <div style={wrapperStyles.card}>
        <h2 style={wrapperStyles.title}>Нужно подключить базу данных</h2>
        <p style={wrapperStyles.text}>
          Эта версия сайта показывает историю заказов всем официантам, поэтому
          ей нужна общая база данных (Supabase — бесплатно). Создай проект на{" "}
          <strong>supabase.com</strong>, выполни SQL из README, а затем впиши
          его URL и ключ в файл <code>.env</code> (см. README.md в проекте) и
          пересобери сайт.
        </p>
      </div>
    </div>
  );
}

function WaiterPicker({ onPick, onSwitchCafe, restaurantName }) {
  const [custom, setCustom] = useState("");

  return (
    <div style={wrapperStyles.center}>
      <div style={wrapperStyles.card}>
        <h2 style={wrapperStyles.title}>Кто вы?</h2>
        <p style={wrapperStyles.text}>
          {restaurantName} · выберите свое имя — под ним будут видны только
          ваши активные заказы. Историю заказов видят все.
        </p>
        <div style={wrapperStyles.namesGrid}>
          {WAITER_NAMES.map((name) => (
            <button
              key={name}
              style={wrapperStyles.nameBtn}
              onClick={() => onPick(name)}
            >
              <User size={16} strokeWidth={2.2} />
              {name}
            </button>
          ))}
        </div>
        <div style={wrapperStyles.customRow}>
          <input
            style={wrapperStyles.customInput}
            placeholder="Или впишите свое имя"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            style={wrapperStyles.customBtn}
            disabled={!custom.trim()}
            onClick={() => onPick(custom.trim())}
          >
            Войти
          </button>
        </div>
        <button style={wrapperStyles.linkBtn} onClick={onSwitchCafe}>
          Не то кафе? Сменить
        </button>
      </div>
    </div>
  );
}

function PinScreen({ onResolved }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setError(null);
    const { restaurant, error: err } = await fetchRestaurantByPin(pin);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    onResolved(restaurant);
  };

  return (
    <div style={wrapperStyles.center}>
      <div style={wrapperStyles.card}>
        <h2 style={wrapperStyles.title}>Вход по PIN-коду</h2>
        <p style={wrapperStyles.text}>
          Введите PIN-код вашего заведения — его выдал администратор сайта.
          Дальше вход будет запоминаться на этом устройстве.
        </p>
        <input
          style={wrapperStyles.pinInput}
          type="text"
          inputMode="numeric"
          autoFocus
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && <p style={wrapperStyles.pinError}>{error}</p>}
        <button
          style={{
            ...wrapperStyles.customBtn,
            width: "100%",
            padding: "13px 0",
            opacity: loading || !pin.trim() ? 0.6 : 1,
          }}
          disabled={loading || !pin.trim()}
          onClick={submit}
        >
          {loading ? "Проверяем..." : "Войти"}
        </button>
      </div>
    </div>
  );
}

const WAITER_KEY = "waiter-current-name";

export default function App() {
  const [waiterName, setWaiterName] = useState(() => {
    try {
      return localStorage.getItem(WAITER_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  // restaurant: null (ещё не знаем), undefined (загружается), объект (готово)
  const [restaurant, setRestaurant] = useState(undefined);

  // При открытии сайта — проверяем, не привязано ли уже это устройство к кафе
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cachedId = getCachedRestaurantId();
      if (!cachedId) {
        if (!cancelled) setRestaurant(null);
        return;
      }
      const { restaurant: found, error } = await fetchRestaurantById(cachedId);
      if (cancelled) return;
      if (error || !found) {
        // кафе удалили или id больше не существует — просим войти заново
        setCachedRestaurantId(null);
        setRestaurant(null);
      } else {
        setRestaurant(found);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPinResolved = (found) => {
    setCachedRestaurantId(found.id);
    setRestaurant(found);
  };

  useEffect(() => {
    if (restaurant && restaurant.name) {
      document.title = `Меню официанта — ${restaurant.name}`;
    }
  }, [restaurant]);

  const switchCafe = () => {
    setCachedRestaurantId(null);
    setRestaurant(null);
    setWaiterName(null);
    try {
      localStorage.removeItem(WAITER_KEY);
    } catch (e) {
      // ничего страшного
    }
  };

  const pickWaiter = (name) => {
    try {
      localStorage.setItem(WAITER_KEY, name);
    } catch (e) {
      console.error("Не удалось сохранить имя официанта", e);
    }
    setWaiterName(name);
  };

  const switchWaiter = () => {
    try {
      localStorage.removeItem(WAITER_KEY);
    } catch (e) {
      // ничего страшного
    }
    setWaiterName(null);
  };

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (restaurant === undefined) return null; // проверяем кэш — доля секунды
  if (restaurant === null) return <PinScreen onResolved={onPinResolved} />;
  if (!waiterName)
    return (
      <WaiterPicker
        onPick={pickWaiter}
        onSwitchCafe={switchCafe}
        restaurantName={restaurant.name}
      />
    );
  return (
    <OrderScreen
      waiterName={waiterName}
      onSwitchWaiter={switchWaiter}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      categories={restaurant.menu?.categories || []}
      items={restaurant.menu?.items || []}
    />
  );
}

const wrapperStyles = {
  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1B1918",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    background: "#242120",
    border: "1px solid #3a3532",
    borderRadius: 16,
    padding: "26px 22px",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
    color: "#F4EFE6",
    margin: "0 0 8px",
  },
  text: {
    fontSize: 13.5,
    color: "#9a938d",
    lineHeight: 1.5,
    margin: "0 0 20px",
  },
  namesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 16,
  },
  nameBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "13px 0",
    borderRadius: 10,
    border: "1px solid #3a3532",
    background: "#1B1918",
    color: "#F4EFE6",
    fontSize: 14.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  customRow: {
    display: "flex",
    gap: 8,
  },
  customInput: {
    flex: 1,
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "11px 12px",
    color: "#F4EFE6",
    fontSize: 14,
    boxSizing: "border-box",
  },
  customBtn: {
    padding: "0 18px",
    borderRadius: 10,
    border: "none",
    background: "#8C2F2A",
    color: "#F4EFE6",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  pinInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "14px 12px",
    color: "#F4EFE6",
    fontSize: 22,
    letterSpacing: "0.3em",
    textAlign: "center",
    marginBottom: 12,
  },
  pinError: {
    color: "#e07a72",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 14,
  },
  linkBtn: {
    display: "block",
    width: "100%",
    marginTop: 14,
    background: "none",
    border: "none",
    color: "#8a8480",
    fontSize: 12.5,
    textDecoration: "underline",
    cursor: "pointer",
    textAlign: "center",
  },
};

// --- Стили экрана заказа ------------------------------------------------

const WINE = "#8C2F2A";
const GOLD = "#C9982E";
const INK = "#1B1918";
const PANEL = "#242120";
const PAPER = "#F4EFE6";

const styles = {
  app: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: INK,
    color: PAPER,
    height: "100vh",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    flexShrink: 0,
    padding: "18px 16px 0",
    borderBottom: `1px solid #35312e`,
  },
  restaurantLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6f6a65",
    marginBottom: 8,
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  tableStepper: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    border: "1px solid transparent",
    padding: "2px 4px",
  },
  tableStepperLocked: {
    border: "1px solid #b3564f",
    background: "rgba(179,86,79,0.12)",
  },
  tableNumLocked: {
    color: "#e07a72",
  },
  lockWarning: {
    flexShrink: 0,
    fontSize: 12.5,
    color: "#e07a72",
    background: "rgba(179,86,79,0.12)",
    borderTop: "1px solid #3a3532",
    padding: "8px 16px",
    textAlign: "center",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  waiterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  waiterBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: "#c9c4bf",
    background: PANEL,
    border: "1px solid #3a3532",
    borderRadius: 20,
    padding: "4px 10px",
  },
  waiterRowRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  syncWarning: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#e07a72",
  },
  switchWaiterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#8a8480",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 2px",
  },
  historyBtn: {
    position: "relative",
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: PANEL,
    color: "#c9c4bf",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  historyBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    padding: "0 3px",
    borderRadius: 8,
    background: WINE,
    color: PAPER,
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  ordersTabs: {
    display: "flex",
    gap: 8,
    marginBottom: 14,
  },
  ordersTab: {
    flex: 1,
    padding: "9px 0",
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#9a938d",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  ordersTabActive: {
    background: WINE,
    borderColor: WINE,
    color: PAPER,
  },
  completeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: GOLD,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  historyEmpty: {
    fontSize: 14,
    color: "#8a8480",
    textAlign: "center",
    padding: "20px 4px 8px",
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid #35312e",
    paddingBottom: 10,
  },
  historyRowMain: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    background: "none",
    border: "none",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
  },
  historyTable: {
    fontSize: 15,
    fontWeight: 700,
    color: PAPER,
  },
  historyMeta: {
    fontSize: 12.5,
    color: "#8a8480",
  },
  historyWaiter: {
    fontSize: 11.5,
    color: GOLD,
    fontWeight: 600,
    marginTop: 2,
  },
  historyDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#b3564f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#9a938d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 400,
    background: PANEL,
    borderRadius: 18,
    padding: "26px 22px 22px",
    margin: "0 16px",
    textAlign: "center",
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(179,86,79,0.15)",
    color: "#e07a72",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  confirmTitle: {
    fontSize: 16.5,
    fontWeight: 700,
    color: PAPER,
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 13.5,
    color: "#9a938d",
    lineHeight: 1.4,
    marginBottom: 20,
  },
  confirmActions: {
    display: "flex",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    padding: "13px 0",
    borderRadius: 10,
    border: "1px solid #3a3532",
    background: "transparent",
    color: PAPER,
    fontSize: 14.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmDeleteBtn: {
    flex: 1,
    padding: "13px 0",
    borderRadius: 10,
    border: "none",
    background: "#b3564f",
    color: PAPER,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  tableLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#8a8480",
    marginRight: 2,
  },
  tableBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "1px solid #3a3532",
    background: PANEL,
    color: PAPER,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  tableNum: {
    fontSize: 15,
    fontWeight: 700,
    color: GOLD,
    minWidth: 30,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  },
  pageIndicator: {
    fontSize: 12,
    color: "#8a8480",
    fontVariantNumeric: "tabular-nums",
  },
  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    flex: "1 1 calc(50% - 4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "11px 0",
    borderRadius: 10,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#9a938d",
    fontSize: 14.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabActive: {
    background: WINE,
    borderColor: WINE,
    color: PAPER,
  },
  gridWrap: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    padding: "14px 16px 0",
    overflow: "hidden",
  },
  grid: {
    display: "grid",
    gap: GRID_GAP,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    alignContent: "start",
  },
  card: {
    background: PANEL,
    border: "1px solid #35312e",
    borderRadius: 12,
    padding: "12px 12px 10px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: CARD_H,
    boxSizing: "border-box",
    overflow: "hidden",
  },
  cardActive: {
    borderColor: GOLD,
    boxShadow: `0 0 0 1px ${GOLD} inset`,
  },
  cardTop: {
    marginBottom: 10,
  },
  cardNameRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 5,
  },
  cardName: {
    fontSize: 14.5,
    fontWeight: 600,
    lineHeight: 1.25,
    color: PAPER,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  commentBtn: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#6f6a65",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  commentBtnActive: {
    color: GOLD,
  },
  cardComment: {
    fontSize: 11.5,
    color: GOLD,
    fontStyle: "italic",
    marginBottom: 6,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardPrice: {
    fontSize: 13,
    color: GOLD,
    fontWeight: 600,
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#1B1918",
    borderRadius: 8,
    padding: "4px 6px",
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: "none",
    background: "#33302d",
    color: PAPER,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  stepNum: {
    fontSize: 16,
    fontWeight: 700,
    minWidth: 20,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  },
  pager: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: "14px 0",
  },
  pagerBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1px solid #3a3532",
    background: PANEL,
    color: PAPER,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  dots: {
    display: "flex",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    border: "none",
    background: "#4a453f",
    cursor: "pointer",
    padding: 0,
  },
  dotActive: {
    background: GOLD,
    width: 18,
    borderRadius: 4,
  },
  footer: {
    flexShrink: 0,
    background: PANEL,
    borderTop: "1px solid #3a3532",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  footerInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 78,
  },
  footerCount: {
    fontSize: 12,
    color: "#9a938d",
  },
  footerSum: {
    fontSize: 17,
    fontWeight: 700,
    color: GOLD,
  },
  confirmBtn: {
    flex: 1,
    padding: "14px 0",
    borderRadius: 10,
    border: "none",
    background: WINE,
    color: PAPER,
    fontSize: 15.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  confirmBtnDisabled: {
    background: "#3a3532",
    color: "#77726c",
    cursor: "not-allowed",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    background: PANEL,
    borderRadius: "18px 18px 0 0",
    padding: "18px 18px 26px",
    maxHeight: "82vh",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: PAPER,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9a938d",
    cursor: "pointer",
    padding: 4,
  },
  modalList: {
    overflowY: "auto",
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modalRowWrap: {
    borderBottom: "1px solid #35312e",
    paddingBottom: 8,
  },
  modalRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    fontSize: 14.5,
  },
  modalRowComment: {
    fontSize: 12.5,
    color: GOLD,
    fontStyle: "italic",
    marginTop: 3,
  },
  commentModal: {
    width: "100%",
    maxWidth: 480,
    background: PANEL,
    borderRadius: "18px 18px 0 0",
    padding: "18px 18px 26px",
  },
  quickRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  quickChip: {
    padding: "8px 12px",
    borderRadius: 20,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#c9c4bf",
    fontSize: 13,
    cursor: "pointer",
  },
  quickChipActive: {
    background: GOLD,
    borderColor: GOLD,
    color: INK,
    fontWeight: 700,
  },
  commentInput: {
    width: "100%",
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "12px",
    color: PAPER,
    fontSize: 14.5,
    fontFamily: "inherit",
    resize: "none",
    marginBottom: 14,
    boxSizing: "border-box",
  },
  modalRowQty: {
    color: GOLD,
    fontWeight: 700,
    minWidth: 26,
  },
  modalRowName: {
    flex: 1,
    color: PAPER,
  },
  modalRowPrice: {
    color: "#9a938d",
    fontVariantNumeric: "tabular-nums",
  },
  modalTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 16,
    fontWeight: 700,
    color: PAPER,
    padding: "8px 0 16px",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "15px 0",
    borderRadius: 10,
    border: "none",
    background: GOLD,
    color: INK,
    fontSize: 15.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  sentBox: {
    textAlign: "center",
    padding: "10px 0 6px",
  },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: GOLD,
    color: INK,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  sentText: {
    fontSize: 15,
    color: PAPER,
    marginBottom: 18,
  },
  newOrderBtn: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 10,
    border: "none",
    background: WINE,
    color: PAPER,
    fontSize: 15.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};
