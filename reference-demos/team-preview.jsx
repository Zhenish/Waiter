import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Minus, ChevronLeft, ChevronRight, X, Check, UtensilsCrossed, Wine, MessageSquarePlus, MessageSquareText, History, Trash2, Eye, User, LogOut, Shield, Search, Bell, WifiOff, Flame, Cigarette, Sparkles, Coffee, Package, Wrench, ShoppingBag, Beer, IceCream, Gift, Upload, Lock } from "lucide-react";

// Набор доступных иконок для рубрик — тот же, что и в реальном сайте
const ICON_OPTIONS = [
  { key: "utensils", label: "Еда", Icon: UtensilsCrossed },
  { key: "wine", label: "Вино", Icon: Wine },
  { key: "flame", label: "Кальян", Icon: Flame },
  { key: "cigarette", label: "Сигареты", Icon: Cigarette },
  { key: "sparkles", label: "Услуги", Icon: Sparkles },
  { key: "coffee", label: "Кофе", Icon: Coffee },
  { key: "package", label: "Другое", Icon: Package },
  { key: "wrench", label: "Инструменты", Icon: Wrench },
  { key: "shopping-bag", label: "Товары", Icon: ShoppingBag },
  { key: "beer", label: "Пиво", Icon: Beer },
  { key: "ice-cream", label: "Десерты", Icon: IceCream },
  { key: "gift", label: "Подарки", Icon: Gift },
];
const getCategoryIcon = (key) => ICON_OPTIONS.find((o) => o.key === key)?.Icon || Package;

// Короткий звуковой сигнал тревоги — без внешних аудиофайлов, через Web Audio API
function playAlertSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playBeep = (delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    };
    playBeep(0);
    playBeep(0.3);
    setTimeout(() => ctx.close(), 700);
  } catch (e) {
    // звук недоступен (например, требуется взаимодействие с пользователем) — не критично
  }
}

const WAITER_NAMES = ["Официант 1", "Официант 2", "Официант 3", "Официант 4"];

// В реальном сайте это реальный PIN кафе (проверяется через базу данных).
// Здесь, в превью, — фиксированный демо-PIN, чтобы можно было проверить сценарий.
const DEMO_MENU_PIN = "1234";
const URGENT_MINUTES = 10;

const money = (n) => n.toLocaleString("ru-RU");

const formatDate = (iso) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const elapsedInfo = (iso, now) => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  return { minutes, urgent: minutes >= URGENT_MINUTES };
};

// Тикающие часы — раз в 15 секунд заставляют перерисовать "прошло N минут"
function useNowTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Одна строка списка заказа — переиспользуется в "Активных", "Истории" и у администратора
function OrderRow({ entry, isActive, now, canManage, onView, onComplete, onCancel, onAddMore }) {
  const elapsed = isActive ? elapsedInfo(entry.date, now) : null;
  const urgent = Boolean(elapsed?.urgent);

  return (
    <div
      style={{
        ...styles.historyRow,
        ...(isActive && urgent ? styles.urgentRow : {}),
      }}
    >
      <button style={styles.historyRowMain} onClick={onView}>
        <span style={styles.historyTable}>Стол №{entry.table}</span>
        <span style={styles.historyMeta}>
          {isActive
            ? `${entry.itemsCount} поз. · ${money(entry.total)} ₽`
            : `${formatDate(entry.completedDate)} · ${entry.itemsCount} поз. · ${money(entry.total)} ₽`}
        </span>
        {isActive ? (
          <span
            style={{
              ...styles.timerBadge,
              ...(urgent ? styles.timerBadgeUrgent : {}),
            }}
          >
            {canManage ? "⏱" : "🔴 В процессе · ⏱"} {elapsed.minutes} мин
            {entry.waiter ? ` · ${entry.waiter}` : ""}
            {urgent && canManage ? " — долго ждет!" : ""}
          </span>
        ) : (
          entry.waiter && (
            <span style={styles.historyWaiter}>{entry.waiter}</span>
          )
        )}
        {entry.pendingSync && (
          <span style={styles.pendingBadge}>
            <WifiOff size={11} strokeWidth={2.2} />
            не отправлено — ждёт связи
          </span>
        )}
      </button>
      <button
        style={styles.eyeBtn}
        onClick={onView}
        aria-label={`Состав заказа стола ${entry.table}`}
      >
        <Eye size={17} strokeWidth={2.2} />
      </button>
      {canManage && isActive && (
        <>
          <button
            style={styles.addMoreBtn}
            onClick={onAddMore}
            aria-label={`Добавить блюда к заказу стола ${entry.table}`}
          >
            <Plus size={17} strokeWidth={2.4} />
          </button>
          <button
            style={styles.completeBtn}
            onClick={onComplete}
            aria-label={`Выполнить заказ стола ${entry.table}`}
          >
            <Check size={17} strokeWidth={2.4} />
          </button>
          <button
            style={styles.historyDeleteBtn}
            onClick={onCancel}
            aria-label={`Отменить заказ стола ${entry.table}`}
          >
            <Trash2 size={17} strokeWidth={2.2} />
          </button>
        </>
      )}
    </div>
  );
}

// --- Демо-данные меню (теперь гибкие рубрики, редактируется админом кафе) --

const DEFAULT_CATEGORIES = [
  { id: "food", name: "Еда", icon: "utensils" },
  { id: "bar", name: "Бар", icon: "wine" },
];

const DEFAULT_ITEMS = [
  { id: "f1", name: "Плов с бараниной", price: 420, category: "food" },
  { id: "f2", name: "Шурпа", price: 350, category: "food" },
  { id: "f3", name: "Манты", price: 380, category: "food" },
  { id: "f4", name: "Лагман", price: 360, category: "food" },
  { id: "f5", name: "Самса с говядиной", price: 150, category: "food" },
  { id: "f6", name: "Хачапури по-аджарски", price: 410, category: "food" },
  { id: "f7", name: "Цезарь с курицей", price: 320, category: "food" },
  { id: "f8", name: "Оливье", price: 280, category: "food" },
  { id: "f9", name: "Шашлык из баранины", price: 480, category: "food" },
  { id: "f10", name: "Долма", price: 300, category: "food" },
  { id: "f11", name: "Люля-кебаб", price: 400, category: "food" },
  { id: "f12", name: "Салат Шопский", price: 260, category: "food" },
  { id: "f13", name: "Хинкали (4 шт)", price: 340, category: "food" },
  { id: "f14", name: "Борщ", price: 290, category: "food" },
  { id: "f15", name: "Форель на гриле", price: 550, category: "food" },
  { id: "f16", name: "Гречка с грибами", price: 220, category: "food" },
  { id: "f17", name: "Картофель по-деревенски", price: 190, category: "food" },
  { id: "f18", name: "Тирамису", price: 240, category: "food" },
  { id: "f19", name: "Медовик", price: 230, category: "food" },
  { id: "f20", name: "Мороженое, 2 шарика", price: 180, category: "food" },
  { id: "b1", name: "Чай черный, чайник", price: 150, category: "bar" },
  { id: "b2", name: "Кофе americano", price: 180, category: "bar" },
  { id: "b3", name: "Капучино", price: 210, category: "bar" },
  { id: "b4", name: "Морс клюквенный", price: 160, category: "bar" },
  { id: "b5", name: "Лимонад домашний", price: 220, category: "bar" },
  { id: "b6", name: "Coca-Cola 0.33", price: 140, category: "bar" },
  { id: "b7", name: "Вода без газа 0.5", price: 100, category: "bar" },
  { id: "b8", name: "Вода с газом 0.5", price: 100, category: "bar" },
  { id: "b9", name: "Пиво светлое 0.5", price: 260, category: "bar" },
  { id: "b10", name: "Пиво темное 0.5", price: 280, category: "bar" },
  { id: "b11", name: "Вино красное, бокал", price: 350, category: "bar" },
  { id: "b12", name: "Вино белое, бокал", price: 350, category: "bar" },
  { id: "b13", name: "Виски, 50 мл", price: 420, category: "bar" },
  { id: "b14", name: "Коньяк, 50 мл", price: 450, category: "bar" },
  { id: "b15", name: "Мохито безалкогольный", price: 260, category: "bar" },
  { id: "b16", name: "Апероль шпритц", price: 480, category: "bar" },
  { id: "b17", name: "Свежевыжатый апельсиновый", price: 240, category: "bar" },
  { id: "b18", name: "Компот", price: 130, category: "bar" },
  { id: "b19", name: "Глинтвейн", price: 320, category: "bar" },
  { id: "b20", name: "Эспрессо", price: 140, category: "bar" },
];

// Карточка всегда одной высоты — это то, что делает расчет страниц предсказуемым
const CARD_H = 132; // px, высота карточки блюда
const MIN_CARD_W = 148; // px, минимальная ширина карточки
const GRID_GAP = 10; // px, зазор между карточками

function OrderScreen({
  waiterName,
  onSwitchWaiter,
  allActiveOrders,
  orderHistory,
  addActiveOrder,
  updateActiveOrder,
  completeOrder,
  cancelActiveOrder,
  stopList = [],
  effectiveOnline = true,
  simulateOffline = false,
  onToggleSimulateOffline,
  categories,
  items: menuItemsAll,
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
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [addingToOrderId, setAddingToOrderId] = useState(null); // если задан — отправка обновит существующий заказ, а не создаст новый

  // Настоящие браузерные уведомления (Notification API) — приходят, даже если вкладка
  // свёрнута. Полноценный пуш на закрытое приложение потребует service worker + сервер,
  // это уже часть будущего деплоя, а не этого превью.
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const requestNotifPermission = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  };

  // Только СВОИ активные заказы этот официант видит в списке "Активные"
  const activeOrders = useMemo(
    () => allActiveOrders.filter((o) => o.waiter === waiterName),
    [allActiveOrders, waiterName]
  );

  // Вкладка "История": выполненные заказы (все) + активные заказы ДРУГИХ официантов
  // (видно всем, но управлять ими может только тот, кто их создал — в своей вкладке "Активные")
  const combinedHistoryView = useMemo(() => {
    const othersActive = allActiveOrders.filter((o) => o.waiter !== waiterName);
    return [...othersActive, ...orderHistory].sort(
      (a, b) =>
        new Date(b.completedDate || b.date) - new Date(a.completedDate || a.date)
    );
  }, [allActiveOrders, orderHistory, waiterName]);

  // Черновик текущего набираемого (еще не отправленного) заказа — просто в памяти,
  // свой у каждого официанта на время этой сессии превью
  const [draft, setDraft] = useState({});
  useEffect(() => {
    const d = draft[waiterName];
    if (d) {
      setCategory(d.category ?? "food");
      setTableNumber(d.tableNumber ?? 1);
      setPage(d.page ?? 0);
      setQty(d.qty ?? {});
      setComments(d.comments ?? {});
    } else {
      setCategory("food");
      setTableNumber(1);
      setPage(0);
      setQty({});
      setComments({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiterName]);

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      [waiterName]: { category, tableNumber, page, qty, comments },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, tableNumber, page, qty, comments]);

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

  const q = search.trim().toLowerCase();
  const isSearching = q.length > 0;

  const stopSet = useMemo(() => new Set(stopList), [stopList]);
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const items = useMemo(() => {
    if (isSearching) {
      return menuItemsAll.filter((i) => i.name.toLowerCase().includes(q));
    }
    return menuItemsAll.filter((i) => i.category === category);
  }, [category, q, isSearching, menuItemsAll]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // При смене поискового запроса всегда возвращаемся на первую страницу результатов
  useEffect(() => {
    setPage(0);
  }, [search]);

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
    menuItemsAll.forEach((i) => (map[i.id] = i));
    return map;
  }, [menuItemsAll]);

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
    if (search) setSearch("");
  };

  const changeTable = (delta) => {
    setTableNumber((n) => Math.min(99, Math.max(1, n + delta)));
  };

  // Открыть уже отправленный активный заказ для добавления новых позиций
  const startAddingToOrder = (entry) => {
    setShowOrders(false);
    setCategory("food");
    setPage(0);
    setSearch("");
    setShowSearch(false);
    setTableNumber(entry.table);
    const nextQty = {};
    const nextComments = {};
    (entry.items || []).forEach((i) => {
      nextQty[i.id] = i.n;
      if (i.comment) nextComments[i.id] = i.comment;
    });
    setQty(nextQty);
    setComments(nextComments);
    setAddingToOrderId(entry.id);
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

  // Тикающие часы — раз в 15 секунд заставляют перерисовать время "прошло N минут"
  const nowTick = useNowTick();

  // Звук + вибрация, когда СВОЙ активный заказ впервые пересекает отметку в 10 минут.
  // alertedIds хранит id заказов, для которых сигнал уже прозвучал, чтобы не повторять его на каждый тик.
  const alertedIds = useRef(new Set());
  useEffect(() => {
    activeOrders.forEach((entry) => {
      const { urgent } = elapsedInfo(entry.date, nowTick);
      if (urgent && !alertedIds.current.has(entry.id)) {
        alertedIds.current.add(entry.id);
        playAlertSound();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`Стол №${entry.table} ждёт уже 10 минут`, {
            body: `${entry.itemsCount} поз. · ${money(entry.total)} ₽ — пора проверить заказ`,
            tag: `order-${entry.id}`,
          });
        }
      }
    });
    // Если заказ выполнили/отменили — забываем про него, вдруг id когда-то переиспользуется
    const stillActiveIds = new Set(activeOrders.map((e) => e.id));
    alertedIds.current.forEach((id) => {
      if (!stillActiveIds.has(id)) alertedIds.current.delete(id);
    });
  }, [activeOrders, nowTick]);

  // Стол считается занятым, если по нему есть активный (еще не выполненный) заказ
  // У ЛЮБОГО официанта — повторно оформить заказ на него нельзя, пока его не выполнят или не отменят.
  // Исключение — сам редактируемый сейчас заказ (мы же его и дополняем).
  const activeTableEntry = allActiveOrders.find(
    (e) => e.table === tableNumber && e.id !== addingToOrderId
  );
  const isTableLocked = Boolean(activeTableEntry);

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
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
            {notifPermission === "default" && (
              <button style={styles.notifBtn} onClick={requestNotifPermission}>
                <Bell size={13} strokeWidth={2.2} />
                Включить уведомления
              </button>
            )}
            {notifPermission === "granted" && (
              <span style={styles.notifOn}>
                <Bell size={13} strokeWidth={2.2} />
                уведомления вкл.
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
          <button
            style={{
              ...styles.searchToggle,
              ...(showSearch ? styles.searchToggleActive : {}),
            }}
            onClick={() => setShowSearch((s) => !s)}
            aria-label="Поиск блюда"
          >
            <Search size={18} strokeWidth={2.2} />
          </button>
        </div>
        {showSearch && (
          <div style={styles.searchRow}>
            <Search size={15} strokeWidth={2.2} color="#8a8480" />
            <input
              autoFocus
              style={styles.searchInput}
              placeholder="Поиск по всему меню — еда и бар..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                style={styles.searchClear}
                onClick={() => setSearch("")}
                aria-label="Очистить поиск"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            )}
          </div>
        )}
        {!effectiveOnline && (
          <div style={styles.offlineBanner}>
            <WifiOff size={14} strokeWidth={2.2} />
            Нет соединения — заказы сохраняются на устройстве и отправятся,
            когда интернет вернётся
          </div>
        )}
        <button
          style={styles.simulateOfflineBtn}
          onClick={onToggleSimulateOffline}
        >
          {simulateOffline
            ? "Демо: вернуть соединение"
            : "Демо: симулировать офлайн"}
        </button>
        {addingToOrderId && (
          <div style={styles.addingBanner}>
            Добавляете к заказу стола №{tableNumber}
            <button
              style={styles.addingCancelBtn}
              onClick={() => {
                setAddingToOrderId(null);
                setQty({});
                setComments({});
              }}
            >
              Отменить
            </button>
          </div>
        )}
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
          {items.length === 0 && (
            <div style={styles.noResults}>
              Ничего не найдено по запросу «{search}»
            </div>
          )}
          {pageItems.map((item) => {
            const n = qty[item.id] || 0;
            const stopped = stopSet.has(item.id);
            return (
              <div
                key={item.id}
                style={{
                  ...styles.card,
                  ...(n > 0 ? styles.cardActive : {}),
                  ...(stopped ? styles.cardStopped : {}),
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
                  <div style={styles.cardBottomRow}>
                    <div style={styles.cardPrice}>{money(item.price)} ₽</div>
                    {stopped ? (
                      <span style={styles.stopBadge}>СТОП</span>
                    ) : (
                      isSearching &&
                      (() => {
                        const cat = categoryById.get(item.category);
                        const CatIcon = getCategoryIcon(cat?.icon);
                        return (
                          <span style={styles.cardCatBadge}>
                            <CatIcon size={11} strokeWidth={2.4} />
                            {cat?.name || item.category}
                          </span>
                        );
                      })()
                    )}
                  </div>
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
                    style={{
                      ...styles.stepBtn,
                      ...(stopped ? styles.stepBtnDisabled : {}),
                    }}
                    onClick={() => changeQty(item.id, 1)}
                    disabled={stopped}
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
          {isTableLocked
            ? "Стол занят"
            : addingToOrderId
            ? "Обновить заказ"
            : "Подтвердить заказ"}
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

            {ordersTab === "active" ? (
              activeOrders.length === 0 ? (
                <p style={styles.historyEmpty}>
                  Активных заказов нет. Они появляются здесь после отправки
                  заказа и блокируют стол до выполнения.
                </p>
              ) : (
                <div style={styles.modalList}>
                  {activeOrders.map((entry) => (
                    <OrderRow
                      key={entry.id}
                      entry={entry}
                      isActive
                      now={nowTick}
                      canManage
                      onView={() => setViewingOrder(entry)}
                      onComplete={() => completeOrder(entry.id)}
                      onCancel={() => setConfirmingCancel(entry)}
                      onAddMore={() => startAddingToOrder(entry)}
                    />
                  ))}
                </div>
              )
            ) : combinedHistoryView.length === 0 ? (
              <p style={styles.historyEmpty}>
                Пока пусто. Здесь видны выполненные заказы, а также активные
                заказы других официантов (без возможности их изменить).
              </p>
            ) : (
              <div style={styles.modalList}>
                {combinedHistoryView.map((entry) => (
                  <OrderRow
                    key={entry.id}
                    entry={entry}
                    isActive={!entry.completedDate}
                    now={nowTick}
                    canManage={false}
                    onView={() => setViewingOrder(entry)}
                  />
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
      <OrderDetailModal
        order={viewingOrder}
        onClose={() => setViewingOrder(null)}
      />

      {/* Summary modal */}
      {showSummary && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {sent
                  ? addingToOrderId
                    ? "Заказ обновлен"
                    : "Заказ отправлен"
                  : addingToOrderId
                  ? `Добавление к столу №${tableNumber}`
                  : "Проверьте заказ"}
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
                    const itemsPayload = selectedList.map((i) => ({
                      id: i.id,
                      name: i.name,
                      price: i.price,
                      n: i.n,
                      comment: comments[i.id] || null,
                    }));
                    if (addingToOrderId) {
                      updateActiveOrder(addingToOrderId, {
                        items: itemsPayload,
                        itemsCount: totalCount,
                        total: totalSum,
                      });
                    } else {
                      addActiveOrder({
                        id: `${Date.now()}`,
                        table: tableNumber,
                        date: new Date().toISOString(),
                        itemsCount: totalCount,
                        total: totalSum,
                        items: itemsPayload,
                      });
                    }
                    setSent(true);
                  }}
                >
                  <Check size={18} strokeWidth={2.5} />
                  {addingToOrderId ? "Сохранить изменения" : "Отправить на кухню/бар"}
                </button>
              </>
            ) : (
              <div style={styles.sentBox}>
                <div style={styles.sentIcon}>
                  <Check size={28} strokeWidth={3} />
                </div>
                <p style={styles.sentText}>
                  {!effectiveOnline
                    ? `Нет соединения — заказ стола №${tableNumber} сохранён на устройстве и отправится, когда появится интернет.`
                    : addingToOrderId
                    ? `Заказ стола №${tableNumber} обновлен — теперь в нем ${totalCount} поз.`
                    : `Заказ на ${totalCount} позиций передан. Стол №${tableNumber}.`}
                </p>
                <button
                  style={styles.newOrderBtn}
                  onClick={() => {
                    setQty({});
                    setComments({});
                    setAddingToOrderId(null);
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

// --- Обертка: выбор официанта → сам экран заказа --------

// Модалка с составом заказа — используется и у официанта, и у администратора
function OrderDetailModal({ order, onClose }) {
  if (!order) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Стол №{order.table}</div>
            <div style={styles.historyMeta}>
              {formatDate(order.completedDate || order.date)}
              {order.waiter ? ` · ${order.waiter}` : ""}
              {!order.completedDate ? " · в процессе" : ""}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.modalList}>
          {(order.items || []).map((i) => (
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
          <span>{money(order.total)} ₽</span>
        </div>
      </div>
    </div>
  );
}

// Экран администратора: видит АБСОЛЮТНО ВСЕ активные заказы всех официантов
// и всю историю, но не может ничего выполнить или отменить — только смотреть
function AdminScreen({
  allActiveOrders,
  orderHistory,
  onSwitchWaiter,
  stopList = [],
  onToggleStopList,
  categories,
  items: menuItemsAll,
  onUpdateMenu,
}) {
  const [tab, setTab] = useState("active"); // "active" | "done" | "stop" | "kitchen" | "stats" | "menu"
  const [viewingOrder, setViewingOrder] = useState(null);
  const [stopSearch, setStopSearch] = useState("");
  const [menuUnlocked, setMenuUnlocked] = useState(false);
  const [menuPinInput, setMenuPinInput] = useState("");
  const [menuPinError, setMenuPinError] = useState(null);

  // Разблокировка меню НЕ запоминается — при каждом уходе с вкладки "Меню"
  // (и возврате обратно) PIN приходится вводить заново. Это осознанное решение:
  // изменение меню — более серьёзное действие, чем обычный вход, поэтому
  // на него не распространяется "запомнить на этом устройстве".
  useEffect(() => {
    if (tab !== "menu") {
      setMenuUnlocked(false);
      setMenuPinInput("");
      setMenuPinError(null);
    }
  }, [tab]);
  const nowTick = useNowTick();

  const stopSet = useMemo(() => new Set(stopList), [stopList]);
  const catById = useMemo(
    () => new Map(menuItemsAll.map((i) => [i.id, i.category])),
    [menuItemsAll]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const sortedActive = useMemo(
    () => [...allActiveOrders].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [allActiveOrders]
  );
  const sortedHistory = useMemo(
    () =>
      [...orderHistory].sort(
        (a, b) => new Date(b.completedDate) - new Date(a.completedDate)
      ),
    [orderHistory]
  );

  const stopListMenuItems = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    if (!q) return menuItemsAll;
    return menuItemsAll.filter((i) => i.name.toLowerCase().includes(q));
  }, [stopSearch, menuItemsAll]);

  // Очередь по цехам: сколько чего сейчас ждёт готовки — отдельно по каждой
  // рубрике меню (не только еда/бар — сколько рубрик, столько и колонок)
  const kitchenQueue = useMemo(() => {
    const buckets = new Map(categories.map((c) => [c.id, new Map()]));
    allActiveOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const catId = catById.get(item.id);
        const bucket = buckets.get(catId);
        if (!bucket) return; // рубрику потом удалили — просто пропускаем
        const existing = bucket.get(item.id);
        if (existing) {
          existing.qty += item.n;
          existing.tables.push(order.table);
        } else {
          bucket.set(item.id, { name: item.name, qty: item.n, tables: [order.table] });
        }
      });
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      list: [...buckets.get(c.id).values()].sort((a, b) => b.qty - a.qty),
    }));
  }, [allActiveOrders, catById, categories]);

  // Простая аналитика по выполненным заказам
  const stats = useMemo(() => {
    const isToday = (iso) =>
      new Date(iso).toDateString() === new Date().toDateString();
    const todayOrders = orderHistory.filter((o) => isToday(o.completedDate));

    const totalRevenue = orderHistory.reduce((s, o) => s + (o.total || 0), 0);
    const avgCheck = orderHistory.length
      ? Math.round(totalRevenue / orderHistory.length)
      : 0;
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);

    const dishCounts = new Map();
    orderHistory.forEach((o) => {
      (o.items || []).forEach((item) => {
        const cur = dishCounts.get(item.name) || 0;
        dishCounts.set(item.name, cur + item.n);
      });
    });
    const topDishes = [...dishCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const waiterStats = new Map();
    orderHistory.forEach((o) => {
      const w = o.waiter || "—";
      const cur = waiterStats.get(w) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.total || 0;
      waiterStats.set(w, cur);
    });
    const waiterList = [...waiterStats.entries()].sort(
      (a, b) => b[1].revenue - a[1].revenue
    );

    return {
      ordersToday: todayOrders.length,
      todayRevenue,
      totalOrders: orderHistory.length,
      totalRevenue,
      avgCheck,
      topDishes,
      waiterList,
    };
  }, [orderHistory]);

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.waiterRow}>
          <div style={styles.waiterBadge}>
            <Shield size={13} strokeWidth={2.4} />
            Администратор
          </div>
          <div style={styles.waiterRowRight}>
            <button style={styles.switchWaiterBtn} onClick={onSwitchWaiter}>
              <LogOut size={13} strokeWidth={2.2} />
              Сменить
            </button>
          </div>
        </div>
        <div style={styles.adminTabs}>
          <button
            style={{
              ...styles.adminTab,
              ...(tab === "active" ? styles.ordersTabActive : {}),
            }}
            onClick={() => setTab("active")}
          >
            Активные{sortedActive.length > 0 ? ` (${sortedActive.length})` : ""}
          </button>
          <button
            style={{
              ...styles.adminTab,
              ...(tab === "kitchen" ? styles.ordersTabActive : {}),
            }}
            onClick={() => setTab("kitchen")}
          >
            Кухня/Бар
          </button>
          <button
            style={{
              ...styles.adminTab,
              ...(tab === "stats" ? styles.ordersTabActive : {}),
            }}
            onClick={() => setTab("stats")}
          >
            Аналитика
          </button>
          <button
            style={{
              ...styles.adminTab,
              ...(tab === "done" ? styles.ordersTabActive : {}),
            }}
            onClick={() => setTab("done")}
          >
            История
          </button>
          <button
            style={{
              ...styles.adminTab,
              ...(tab === "stop" ? styles.ordersTabActive : {}),
            }}
            onClick={() => setTab("stop")}
          >
            Стоп-лист{stopList.length > 0 ? ` (${stopList.length})` : ""}
          </button>
          <button
            style={{
              ...styles.adminTab,
              ...(tab === "menu" ? styles.ordersTabActive : {}),
            }}
            onClick={() => setTab("menu")}
          >
            <Lock size={12} strokeWidth={2.4} style={{ marginRight: 3 }} />
            Меню
          </button>
        </div>
      </div>

      <div style={styles.adminBody}>
        {tab === "active" ? (
          sortedActive.length === 0 ? (
            <p style={styles.historyEmpty}>
              Сейчас ни у одного официанта нет активных заказов.
            </p>
          ) : (
            <div style={styles.modalList}>
              {sortedActive.map((entry) => (
                <OrderRow
                  key={entry.id}
                  entry={entry}
                  isActive
                  now={nowTick}
                  canManage={false}
                  onView={() => setViewingOrder(entry)}
                />
              ))}
            </div>
          )
        ) : tab === "done" ? (
          sortedHistory.length === 0 ? (
            <p style={styles.historyEmpty}>Пока нет выполненных заказов.</p>
          ) : (
            <div style={styles.modalList}>
              {sortedHistory.map((entry) => (
                <OrderRow
                  key={entry.id}
                  entry={entry}
                  isActive={false}
                  now={nowTick}
                  canManage={false}
                  onView={() => setViewingOrder(entry)}
                />
              ))}
            </div>
          )
        ) : tab === "kitchen" ? (
          <div style={styles.kitchenCols}>
            {kitchenQueue.map((col) => {
              const ColIcon = getCategoryIcon(col.icon);
              return (
                <div key={col.id} style={styles.kitchenCol}>
                  <div style={styles.kitchenColTitle}>
                    <ColIcon size={15} strokeWidth={2.2} />
                    {col.name}
                  </div>
                  {col.list.length === 0 ? (
                    <p style={styles.historyEmpty}>Ничего не ждёт в этой рубрике.</p>
                  ) : (
                    col.list.map((d) => (
                      <div key={d.name} style={styles.kitchenRow}>
                        <span style={styles.kitchenRowName}>{d.name}</span>
                        <span style={styles.kitchenRowQty}>×{d.qty}</span>
                        <span style={styles.kitchenRowTables}>
                          столы: {d.tables.join(", ")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : tab === "stats" ? (
          <div>
            <div style={styles.statCards}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.ordersToday}</div>
                <div style={styles.statLabel}>заказов сегодня</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{money(stats.todayRevenue)} ₽</div>
                <div style={styles.statLabel}>выручка сегодня</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{money(stats.avgCheck)} ₽</div>
                <div style={styles.statLabel}>средний чек</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.totalOrders}</div>
                <div style={styles.statLabel}>заказов всего</div>
              </div>
            </div>

            <div style={styles.statSectionTitle}>Топ блюд</div>
            {stats.topDishes.length === 0 ? (
              <p style={styles.historyEmpty}>Пока нет выполненных заказов.</p>
            ) : (
              <div style={styles.modalList}>
                {stats.topDishes.map(([name, qty], idx) => (
                  <div key={name} style={styles.statRow}>
                    <span style={styles.statRowRank}>{idx + 1}</span>
                    <span style={styles.statRowName}>{name}</span>
                    <span style={styles.statRowValue}>×{qty}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.statSectionTitle}>По официантам</div>
            {stats.waiterList.length === 0 ? (
              <p style={styles.historyEmpty}>Пока нет данных.</p>
            ) : (
              <div style={styles.modalList}>
                {stats.waiterList.map(([name, w]) => (
                  <div key={name} style={styles.statRow}>
                    <span style={styles.statRowName}>{name}</span>
                    <span style={styles.statRowValue}>
                      {w.count} зак. · {money(w.revenue)} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "stop" ? (
          <>
            <div style={styles.searchRow}>
              <Search size={15} strokeWidth={2.2} color="#8a8480" />
              <input
                style={styles.searchInput}
                placeholder="Поиск по меню..."
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
              />
              {stopSearch && (
                <button
                  style={styles.searchClear}
                  onClick={() => setStopSearch("")}
                  aria-label="Очистить поиск"
                >
                  <X size={15} strokeWidth={2.2} />
                </button>
              )}
            </div>
            <div style={styles.modalList}>
              {stopListMenuItems.map((item) => {
                const stopped = stopSet.has(item.id);
                const StopItemIcon = getCategoryIcon(categoryById.get(item.category)?.icon);
                return (
                  <div key={item.id} style={styles.stopRow}>
                    <div style={styles.stopRowInfo}>
                      <StopItemIcon size={14} strokeWidth={2.2} color="#8a8480" />
                      <span style={styles.stopRowName}>{item.name}</span>
                      <span style={styles.stopRowPrice}>{money(item.price)} ₽</span>
                    </div>
                    <button
                      style={{
                        ...styles.stopToggleBtn,
                        ...(stopped ? styles.stopToggleBtnActive : {}),
                      }}
                      onClick={() => onToggleStopList(item.id)}
                    >
                      {stopped ? "Вернуть в меню" : "В стоп-лист"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : !menuUnlocked ? (
          <div style={styles.menuLockBox}>
            <div style={styles.menuLockIcon}>
              <Lock size={22} strokeWidth={2.2} />
            </div>
            <div style={styles.menuLockTitle}>Изменение меню защищено PIN-кодом</div>
            <p style={styles.menuLockWarning}>
              В отличие от обычного входа, этот код не запоминается на устройстве —
              его нужно вводить каждый раз, когда вы хотите изменить меню. Это
              сделано специально: правки в меню сразу видят все официанты и
              клиенты, поэтому здесь важна лишняя проверка.
            </p>
            <input
              style={styles.menuPinInput}
              type="text"
              inputMode="numeric"
              placeholder="••••"
              value={menuPinInput}
              onChange={(e) => {
                setMenuPinInput(e.target.value.replace(/\s/g, ""));
                setMenuPinError(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (menuPinInput.trim() === DEMO_MENU_PIN) setMenuUnlocked(true);
                else setMenuPinError("Неверный PIN-код.");
              }}
            />
            {menuPinError && <p style={styles.menuPinError}>{menuPinError}</p>}
            <button
              style={styles.menuUnlockBtn}
              onClick={() => {
                if (menuPinInput.trim() === DEMO_MENU_PIN) setMenuUnlocked(true);
                else setMenuPinError("Неверный PIN-код.");
              }}
            >
              Разблокировать
            </button>
            <p style={styles.menuPinHint}>Демо-PIN для этого превью: {DEMO_MENU_PIN}</p>
          </div>
        ) : (
          <MenuEditor categories={categories} items={menuItemsAll} onUpdateMenu={onUpdateMenu} />
        )}
      </div>

      <OrderDetailModal
        order={viewingOrder}
        onClose={() => setViewingOrder(null)}
      />
    </div>
  );
}

// Редактор меню администратора кафе — те же две возможности, что и у владельца:
// вставка кода целиком (дополняет, не затирает) и добавление/удаление по одному
function MenuEditor({ categories, items, onUpdateMenu }) {
  const [localCategories, setLocalCategories] = useState(categories);
  const [localItems, setLocalItems] = useState(items);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(null);
  const [importInfo, setImportInfo] = useState(null);

  const commit = (nextCategories, nextItems) => {
    setLocalCategories(nextCategories);
    setLocalItems(nextItems);
    onUpdateMenu({ categories: nextCategories, items: nextItems });
  };

  const addCategory = () => {
    const id = `cat${localCategories.length + 1}-${Date.now().toString().slice(-4)}`;
    commit([...localCategories, { id, name: "", icon: "package" }], localItems);
  };
  const updateCategory = (idx, patch) => {
    const next = [...localCategories];
    next[idx] = { ...next[idx], ...patch };
    commit(next, localItems);
  };
  const removeCategory = (idx) => {
    const removedId = localCategories[idx].id;
    commit(
      localCategories.filter((_, i) => i !== idx),
      localItems.filter((it) => it.category !== removedId)
    );
  };

  const addItem = () => {
    const id = `item${Date.now().toString().slice(-6)}`;
    const firstCat = localCategories[0]?.id || "";
    commit(localCategories, [...localItems, { id, name: "", price: 0, category: firstCat }]);
  };
  const updateItem = (idx, patch) => {
    const next = [...localItems];
    next[idx] = { ...next[idx], ...patch };
    commit(localCategories, next);
  };
  const removeItem = (idx) => {
    commit(localCategories, localItems.filter((_, i) => i !== idx));
  };

  const applyImport = () => {
    let raw;
    try {
      raw = JSON.parse(importText);
    } catch (e) {
      setImportError(`Невалидный JSON: ${e.message}`);
      setImportInfo(null);
      return;
    }
    const cats = raw.categories;
    const its = raw.items;
    if (!Array.isArray(cats) || !Array.isArray(its)) {
      setImportError('Нужны поля "categories" и "items" (массивы).');
      setImportInfo(null);
      return;
    }

    const existingCatIds = new Set(localCategories.map((c) => c.id));
    const newCats = cats.filter((c) => !existingCatIds.has(c.id));
    const mergedCategories = [...localCategories, ...newCats];

    const itemMap = new Map(localItems.map((it) => [it.id, it]));
    let added = 0;
    let updated = 0;
    its.forEach((it) => {
      if (itemMap.has(it.id)) updated += 1;
      else added += 1;
      itemMap.set(it.id, it);
    });
    const mergedItems = [...itemMap.values()];

    commit(mergedCategories, mergedItems);
    setImportError(null);
    setImportInfo(`Готово: рубрик добавлено — ${newCats.length}, блюд добавлено — ${added}, обновлено — ${updated}.`);
    setImportText("");
  };

  return (
    <div>
      <div style={styles.menuUnlockedBanner}>
        <Lock size={13} strokeWidth={2.2} />
        Меню разблокировано на время этой сессии — уйдёте со вкладки, при
        возврате PIN понадобится снова.
      </div>

      <button
        style={styles.importToggle}
        onClick={() => {
          const el = document.getElementById("menu-import-box");
          if (el) el.style.display = el.style.display === "none" ? "block" : "none";
        }}
      >
        <Upload size={14} strokeWidth={2.2} />
        Вставить сразу много блюд кодом (JSON от DeepSeek)
      </button>
      <div id="menu-import-box">
        <p style={styles.importHint}>
          Вставьте JSON целиком ({"{"}"categories": [...], "items": [...]{"}"})
          — новое добавится, совпадающее по id — обновится, остальное не тронется.
        </p>
        <textarea
          style={styles.importTextarea}
          placeholder='{"categories": [...], "items": [...]}'
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setImportInfo(null);
          }}
          rows={5}
        />
        {importError && <div style={styles.importError}>{importError}</div>}
        {importInfo && <div style={styles.importSuccess}>{importInfo}</div>}
        <button style={styles.applyImportBtn} onClick={applyImport}>
          Добавить эти блюда к меню
        </button>
      </div>

      <div style={styles.sectionTitle}>Или по одному — рубрики</div>
      {localCategories.map((cat, idx) => {
        const Icon = getCategoryIcon(cat.icon);
        return (
          <div key={cat.id} style={styles.catRow}>
            <Icon size={16} strokeWidth={2.2} color="#8a8480" />
            <input
              style={styles.catNameInput}
              value={cat.name}
              placeholder="Название рубрики"
              onChange={(e) => updateCategory(idx, { name: e.target.value })}
            />
            <select
              style={styles.catIconSelect}
              value={cat.icon}
              onChange={(e) => updateCategory(idx, { icon: e.target.value })}
            >
              {ICON_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <button style={styles.rowDeleteBtn} onClick={() => removeCategory(idx)}>
              <Trash2 size={14} strokeWidth={2.2} />
            </button>
          </div>
        );
      })}
      <button style={styles.addRowBtn} onClick={addCategory}>
        <Plus size={14} strokeWidth={2.2} />
        Добавить рубрику
      </button>

      <div style={styles.sectionTitle}>Блюда</div>
      {localItems.map((item, idx) => (
        <div key={item.id} style={styles.itemRow}>
          <input
            style={styles.itemNameInput}
            value={item.name}
            placeholder="Название"
            onChange={(e) => updateItem(idx, { name: e.target.value })}
          />
          <input
            style={styles.itemPriceInput}
            type="number"
            value={item.price}
            onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
          />
          <select
            style={styles.itemCatSelect}
            value={item.category}
            onChange={(e) => updateItem(idx, { category: e.target.value })}
          >
            {localCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
          <button style={styles.rowDeleteBtn} onClick={() => removeItem(idx)}>
            <Trash2 size={14} strokeWidth={2.2} />
          </button>
        </div>
      ))}
      <button style={styles.addRowBtn} onClick={addItem} disabled={!localCategories.length}>
        <Plus size={14} strokeWidth={2.2} />
        Добавить блюдо
      </button>
    </div>
  );
}

function WaiterPicker({ onPick, onPickAdmin }) {
  const [custom, setCustom] = useState("");

  return (
    <div style={wrapperStyles.center}>
      <div style={wrapperStyles.card}>
        <h2 style={wrapperStyles.title}>Кто вы?</h2>
        <p style={wrapperStyles.text}>
          Выберите свое имя — под ним будут видны только ваши активные
          заказы. Историю заказов видят все.
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
        <button style={wrapperStyles.adminBtn} onClick={onPickAdmin}>
          <Shield size={15} strokeWidth={2.2} />
          Войти как администратор
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [waiterName, setWaiterName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Все заказы живут здесь, на уровне App — то есть переключение официанта
  // (снизу вверх/обратно) их не стирает, в отличие от состояния внутри OrderScreen
  const [allActiveOrders, setAllActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);

  // --- Офлайн-режим ---
  // isOnline следит за настоящим состоянием сети браузера.
  // simulateOffline — ручной переключатель для демонстрации сценария прямо здесь,
  // без необходимости по-настоящему отключать интернет.
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [simulateOffline, setSimulateOffline] = useState(false);
  const effectiveOnline = isOnline && !simulateOffline;

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Когда связь появляется снова — считаем, что все "неотправленные" действия дошли
  useEffect(() => {
    if (effectiveOnline) {
      setAllActiveOrders((prev) =>
        prev.map((o) => (o.pendingSync ? { ...o, pendingSync: false } : o))
      );
    }
  }, [effectiveOnline]);

  const addActiveOrder = (entry) => {
    setAllActiveOrders((prev) => [
      { ...entry, waiter: waiterName, pendingSync: !effectiveOnline },
      ...prev,
    ]);
  };

  const completeOrder = (id) => {
    setAllActiveOrders((prev) => {
      const order = prev.find((e) => e.id === id);
      const next = prev.filter((e) => e.id !== id);
      if (order) {
        setOrderHistory((h) => [
          { ...order, completedDate: new Date().toISOString(), pendingSync: !effectiveOnline },
          ...h,
        ]);
      }
      return next;
    });
  };

  const cancelActiveOrder = (id) => {
    setAllActiveOrders((prev) => prev.filter((e) => e.id !== id));
  };

  // Дополнение уже отправленного активного заказа новыми позициями
  const updateActiveOrder = (id, patch) => {
    setAllActiveOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, ...patch, pendingSync: !effectiveOnline } : o
      )
    );
  };

  // Стоп-лист — общий на всех: администратор отмечает блюдо/напиток как недоступный,
  // официанты сразу видят это и не могут его заказать
  const [stopList, setStopList] = useState([]);

  const toggleStopList = (itemId) => {
    setStopList((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Меню (рубрики + блюда) — общее на всех, редактирует администратор кафе
  const [menu, setMenu] = useState({
    categories: DEFAULT_CATEGORIES,
    items: DEFAULT_ITEMS,
  });

  const pickWaiter = (name) => setWaiterName(name);
  const pickAdmin = () => setIsAdmin(true);
  const switchWaiter = () => {
    setWaiterName(null);
    setIsAdmin(false);
  };

  if (isAdmin) {
    return (
      <AdminScreen
        allActiveOrders={allActiveOrders}
        orderHistory={orderHistory}
        onSwitchWaiter={switchWaiter}
        stopList={stopList}
        onToggleStopList={toggleStopList}
        categories={menu.categories}
        items={menu.items}
        onUpdateMenu={setMenu}
      />
    );
  }

  if (!waiterName)
    return <WaiterPicker onPick={pickWaiter} onPickAdmin={pickAdmin} />;
  return (
    <OrderScreen
      waiterName={waiterName}
      onSwitchWaiter={switchWaiter}
      allActiveOrders={allActiveOrders}
      orderHistory={orderHistory}
      addActiveOrder={addActiveOrder}
      updateActiveOrder={updateActiveOrder}
      completeOrder={completeOrder}
      cancelActiveOrder={cancelActiveOrder}
      stopList={stopList}
      effectiveOnline={effectiveOnline}
      simulateOffline={simulateOffline}
      onToggleSimulateOffline={() => setSimulateOffline((s) => !s)}
      categories={menu.categories}
      items={menu.items}
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
  adminBtn: {
    width: "100%",
    marginTop: 16,
    padding: "11px 0",
    borderRadius: 10,
    border: "1px dashed #3a3532",
    background: "transparent",
    color: "#9a938d",
    fontSize: 13.5,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    cursor: "pointer",
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
  notifBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11.5,
    fontWeight: 600,
    color: GOLD,
    background: "none",
    border: "1px solid " + GOLD,
    borderRadius: 20,
    cursor: "pointer",
    padding: "4px 9px",
  },
  notifOn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11.5,
    color: "#8a8480",
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
  adminTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  adminTab: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#9a938d",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  kitchenCols: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  kitchenCol: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  kitchenColTitle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 14,
    fontWeight: 700,
    color: PAPER,
    marginBottom: 2,
  },
  kitchenRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    borderBottom: "1px solid #35312e",
    paddingBottom: 8,
    fontSize: 13.5,
  },
  kitchenRowName: {
    flex: 1,
    color: PAPER,
    fontWeight: 600,
  },
  kitchenRowQty: {
    color: GOLD,
    fontWeight: 700,
  },
  kitchenRowTables: {
    color: "#8a8480",
    fontSize: 12,
    flexShrink: 0,
  },
  statCards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    background: PANEL,
    border: "1px solid #3a3532",
    borderRadius: 12,
    padding: "14px 12px",
    textAlign: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: GOLD,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11.5,
    color: "#9a938d",
  },
  statSectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: PAPER,
    margin: "4px 0 10px",
  },
  statRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid #35312e",
    paddingBottom: 9,
    fontSize: 13.5,
  },
  statRowRank: {
    width: 18,
    color: "#8a8480",
    fontWeight: 700,
  },
  statRowName: {
    flex: 1,
    color: PAPER,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  statRowValue: {
    color: GOLD,
    fontWeight: 600,
    flexShrink: 0,
  },
  addMoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#c9c4bf",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
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
  timerBadge: {
    fontSize: 11.5,
    color: "#8a8480",
    fontWeight: 600,
    marginTop: 2,
  },
  timerBadgeUrgent: {
    color: "#e07a72",
  },
  urgentRow: {
    borderBottomColor: "#b3564f",
    background: "rgba(179,86,79,0.10)",
    borderRadius: 8,
    padding: "6px 6px 10px",
    margin: "-6px -6px 0",
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
  searchToggle: {
    width: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#9a938d",
    cursor: "pointer",
  },
  searchToggleActive: {
    background: WINE,
    borderColor: WINE,
    color: PAPER,
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: PANEL,
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "9px 12px",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: PAPER,
    fontSize: 14.5,
  },
  searchClear: {
    background: "none",
    border: "none",
    color: "#8a8480",
    cursor: "pointer",
    padding: 2,
    display: "flex",
  },
  noResults: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8a8480",
    fontSize: 14,
    textAlign: "center",
    padding: "20px 10px",
  },
  offlineBanner: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(179,86,79,0.14)",
    border: "1px solid #b3564f",
    color: "#e07a72",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    marginBottom: 10,
    lineHeight: 1.35,
  },
  simulateOfflineBtn: {
    fontSize: 11,
    color: "#6f6a65",
    background: "none",
    border: "1px dashed #3a3532",
    borderRadius: 8,
    padding: "5px 9px",
    cursor: "pointer",
    marginBottom: 12,
  },
  pendingBadge: {
    fontSize: 11,
    color: "#e07a72",
    fontWeight: 600,
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  addingBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(201,152,46,0.12)",
    border: "1px solid " + GOLD,
    color: GOLD,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
  },
  addingCancelBtn: {
    background: "none",
    border: "none",
    color: GOLD,
    textDecoration: "underline",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
  adminBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "16px 16px 24px",
  },
  stopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1px solid #35312e",
    paddingBottom: 10,
  },
  stopRowInfo: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  stopRowName: {
    fontSize: 14,
    color: PAPER,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  stopRowPrice: {
    fontSize: 12.5,
    color: "#8a8480",
    flexShrink: 0,
  },
  stopToggleBtn: {
    flexShrink: 0,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #3a3532",
    background: "transparent",
    color: "#9a938d",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  stopToggleBtnActive: {
    background: "#b3564f",
    borderColor: "#b3564f",
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
  cardStopped: {
    opacity: 0.55,
  },
  stopBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#e07a72",
    border: "1px solid #b3564f",
    borderRadius: 4,
    padding: "1px 5px",
    letterSpacing: "0.05em",
  },
  stepBtnDisabled: {
    opacity: 0.3,
    cursor: "not-allowed",
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
  cardBottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardCatBadge: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 10,
    color: "#8a8480",
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
  menuLockBox: {
    textAlign: "center",
    padding: "20px 10px",
  },
  menuLockIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(201,152,46,0.15)",
    color: GOLD,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  menuLockTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    color: PAPER,
    marginBottom: 10,
  },
  menuLockWarning: {
    fontSize: 12.5,
    color: "#9a938d",
    lineHeight: 1.5,
    marginBottom: 18,
    textAlign: "left",
  },
  menuPinInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "12px",
    color: PAPER,
    fontSize: 20,
    letterSpacing: "0.3em",
    textAlign: "center",
    marginBottom: 10,
  },
  menuPinError: {
    color: "#e07a72",
    fontSize: 12.5,
    marginTop: -4,
    marginBottom: 10,
  },
  menuUnlockBtn: {
    width: "100%",
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: WINE,
    color: PAPER,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  menuPinHint: {
    fontSize: 11,
    color: "#6f6a65",
    marginTop: 10,
  },
  menuUnlockedBanner: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    color: GOLD,
    background: "rgba(201,152,46,0.1)",
    border: "1px solid " + GOLD,
    borderRadius: 8,
    padding: "8px 10px",
    marginBottom: 14,
    lineHeight: 1.4,
  },
  importToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "1px dashed #3a3532",
    borderRadius: 8,
    padding: "9px 10px",
    color: "#9a938d",
    fontSize: 12.5,
    cursor: "pointer",
    width: "100%",
    marginBottom: 10,
  },
  importHint: {
    fontSize: 12,
    color: "#9a938d",
    lineHeight: 1.4,
    margin: "0 0 8px",
  },
  importTextarea: {
    width: "100%",
    boxSizing: "border-box",
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 8,
    padding: "10px 12px",
    color: PAPER,
    fontSize: 12.5,
    fontFamily: "monospace",
    resize: "vertical",
  },
  importError: { color: "#e07a72", fontSize: 12, marginTop: 6 },
  importSuccess: { color: "#7fbf8f", fontSize: 12, marginTop: 6 },
  applyImportBtn: {
    marginTop: 8,
    width: "100%",
    background: GOLD,
    color: INK,
    border: "none",
    borderRadius: 8,
    padding: "9px 0",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: PAPER, margin: "10px 0 8px" },
  catRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  catNameInput: {
    flex: 1,
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 9px",
    color: PAPER,
    fontSize: 13,
  },
  catIconSelect: {
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 6px",
    color: "#c9c4bf",
    fontSize: 12,
    maxWidth: 92,
  },
  itemRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  itemNameInput: {
    flex: 1,
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 9px",
    color: PAPER,
    fontSize: 13,
    minWidth: 0,
  },
  itemPriceInput: {
    width: 64,
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 6px",
    color: PAPER,
    fontSize: 13,
  },
  itemCatSelect: {
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 4px",
    color: "#c9c4bf",
    fontSize: 11.5,
    maxWidth: 84,
  },
  rowDeleteBtn: {
    background: "none",
    border: "none",
    color: "#8a8480",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
  },
  addRowBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "1px dashed #3a3532",
    borderRadius: 8,
    padding: "8px 0",
    width: "100%",
    justifyContent: "center",
    color: "#9a938d",
    fontSize: 12.5,
    cursor: "pointer",
    marginBottom: 20,
  },
};
