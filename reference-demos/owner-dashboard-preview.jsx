import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Search,
  X,
  Check,
  Power,
  PowerOff,
  Pencil,
  Copy,
  RefreshCw,
  Upload,
  UtensilsCrossed,
  Wine,
  Flame,
  Cigarette,
  Sparkles,
  Coffee,
  Package,
  Wrench,
  ShoppingBag,
  Beer,
  IceCream,
  Gift,
  Store,
} from "lucide-react";

// --- Иконки рубрик (тот же набор, что и в реальном сайте) -----------------

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
const iconByKey = (key) => ICON_OPTIONS.find((o) => o.key === key)?.Icon || Package;

const STORAGE_KEY = "owner-dashboard-restaurants-demo";

const money = (n) => (n || 0).toLocaleString("ru-RU");

const generatePin = (existing) => {
  let pin;
  do {
    pin = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  } while (existing.includes(pin));
  return pin;
};

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/[а-яё]/g, (ch) => {
      const map = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
        з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
        п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
        ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[ch] ?? "";
    })
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `kafe-${Date.now().toString().slice(-5)}`;

// --- Демо-данные при первом запуске ---------------------------------------

const SEED = [
  {
    id: "kafe-uyut",
    name: "Кафе Уют",
    pin: "48213",
    status: "active",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    menu: {
      categories: [
        { id: "food", name: "Еда", icon: "utensils" },
        { id: "bar", name: "Бар", icon: "wine" },
      ],
      items: [
        { id: "f1", name: "Плов с бараниной", price: 420, category: "food" },
        { id: "f2", name: "Шурпа", price: 350, category: "food" },
        { id: "b1", name: "Чай черный, чайник", price: 150, category: "bar" },
      ],
    },
  },
  {
    id: "plov-house",
    name: "Плов Хаус",
    pin: "91027",
    status: "active",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    menu: {
      categories: [
        { id: "food", name: "Еда", icon: "utensils" },
        { id: "other", name: "Другое", icon: "package" },
      ],
      items: [
        { id: "f1", name: "Плов узбекский", price: 390, category: "food" },
        { id: "o1", name: "Сигареты Marlboro", price: 250, category: "other" },
      ],
    },
  },
  {
    id: "kalyan-lounge",
    name: "Kalyan Lounge",
    pin: "35540",
    status: "disabled",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    menu: {
      categories: [{ id: "hookah", name: "Кальян", icon: "flame" }],
      items: [
        { id: "h1", name: "Кальян классический", price: 800, category: "hookah" },
        { id: "h2", name: "Смена угля", price: 150, category: "hookah" },
      ],
    },
  },
];

// --- Валидация JSON-импорта меню (та же логика, что и в реальном проекте) --

function validateMenuJson(raw) {
  const errors = [];
  const categories = raw.categories;
  const items = raw.items;

  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push('Поле "categories" должно быть непустым массивом рубрик.');
    return { errors };
  }
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Поле "items" должно быть непустым массивом блюд.');
    return { errors };
  }

  const catIds = new Set();
  for (const c of categories) {
    if (!c.id || typeof c.id !== "string") errors.push(`У рубрики нет строкового "id": ${JSON.stringify(c)}`);
    if (!c.name || typeof c.name !== "string") errors.push(`У рубрики "${c.id}" нет "name".`);
    catIds.add(c.id);
  }
  const itemIds = new Set();
  for (const it of items) {
    if (!it.id || typeof it.id !== "string") errors.push(`У блюда нет строкового "id": ${JSON.stringify(it)}`);
    if (!it.name || typeof it.name !== "string") errors.push(`У блюда "${it.id}" нет "name".`);
    if (typeof it.price !== "number") errors.push(`У блюда "${it.id}" ("${it.name}") цена должна быть числом.`);
    if (!catIds.has(it.category)) errors.push(`У блюда "${it.id}" ("${it.name}") рубрика "${it.category}" не найдена.`);
    if (itemIds.has(it.id)) errors.push(`id "${it.id}" повторяется.`);
    itemIds.add(it.id);
  }
  return { errors, categories, items };
}

export default function OwnerDashboard() {
  const [restaurants, setRestaurants] = useState(null); // null = ещё грузится
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // объект кафе или "new"
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        setRestaurants(res?.value ? JSON.parse(res.value) : SEED);
      } catch (e) {
        setRestaurants(SEED);
      }
    })();
  }, []);

  const persist = async (list) => {
    setRestaurants(list);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(list), true);
    } catch (e) {
      console.error("Не удалось сохранить", e);
    }
  };

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    const q = search.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [restaurants, search]);

  const stats = useMemo(() => {
    if (!restaurants) return { total: 0, active: 0, disabled: 0, items: 0 };
    return {
      total: restaurants.length,
      active: restaurants.filter((r) => r.status === "active").length,
      disabled: restaurants.filter((r) => r.status === "disabled").length,
      items: restaurants.reduce((s, r) => s + (r.menu?.items?.length || 0), 0),
    };
  }, [restaurants]);

  const toggleStatus = (id) => {
    persist(
      restaurants.map((r) =>
        r.id === id ? { ...r, status: r.status === "active" ? "disabled" : "active" } : r
      )
    );
  };

  const deleteCafe = (id) => {
    persist(restaurants.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const openNew = () => {
    const existingPins = restaurants.map((r) => r.pin);
    setEditing({
      id: null,
      name: "",
      pin: generatePin(existingPins),
      status: "active",
      isNew: true,
      menu: { categories: [], items: [] },
    });
    setSaveError(null);
  };

  const saveCafe = (cafe) => {
    if (!cafe.name.trim()) {
      setSaveError("Впишите название кафе.");
      return;
    }
    if (!cafe.menu.categories.length) {
      setSaveError("Добавьте хотя бы одну рубрику.");
      return;
    }
    if (!cafe.menu.items.length) {
      setSaveError("Добавьте хотя бы одно блюдо.");
      return;
    }
    if (cafe.isNew) {
      const id = slugify(cafe.name);
      const finalId = restaurants.some((r) => r.id === id) ? `${id}-2` : id;
      persist([
        ...restaurants,
        {
          id: finalId,
          name: cafe.name.trim(),
          pin: cafe.pin,
          status: "active",
          createdAt: new Date().toISOString(),
          menu: cafe.menu,
        },
      ]);
    } else {
      persist(
        restaurants.map((r) =>
          r.id === cafe.id ? { ...r, name: cafe.name.trim(), menu: cafe.menu } : r
        )
      );
    }
    setEditing(null);
  };

  if (restaurants === null) {
    return <div style={styles.app} />;
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.brand}>
            <Store size={18} strokeWidth={2.2} />
            Панель управления
          </div>
          <button style={styles.addBtn} onClick={openNew}>
            <Plus size={16} strokeWidth={2.4} />
            Добавить кафе
          </button>
        </div>

        <div style={styles.statCards}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>всего кафе</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: "#7fbf8f" }}>{stats.active}</div>
            <div style={styles.statLabel}>активных</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: "#e07a72" }}>{stats.disabled}</div>
            <div style={styles.statLabel}>отключено</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.items}</div>
            <div style={styles.statLabel}>блюд всего</div>
          </div>
        </div>

        <div style={styles.searchRow}>
          <Search size={15} strokeWidth={2.2} color="#8a8480" />
          <input
            style={styles.searchInput}
            placeholder="Поиск кафе по названию или id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.body}>
        {filtered.length === 0 ? (
          <p style={styles.empty}>Ничего не найдено.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} style={styles.cafeRow}>
              <div style={styles.cafeRowTop}>
                <div>
                  <div style={styles.cafeName}>
                    {r.name}
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(r.status === "active" ? styles.statusActive : styles.statusDisabled),
                      }}
                    >
                      {r.status === "active" ? "Активно" : "Отключено"}
                    </span>
                  </div>
                  <div style={styles.cafeMeta}>
                    id: {r.id} · {r.menu.categories.length} рубрик · {r.menu.items.length} блюд
                  </div>
                </div>
                <div style={styles.pinBox}>
                  <span style={styles.pinLabel}>PIN</span>
                  <span style={styles.pinValue}>{r.pin}</span>
                  <button
                    style={styles.iconBtn}
                    onClick={() => navigator.clipboard?.writeText(r.pin)}
                    aria-label="Скопировать PIN"
                  >
                    <Copy size={14} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
              <div style={styles.cafeActions}>
                <button
                  style={styles.actionBtn}
                  onClick={() => {
                    setEditing({ ...r, isNew: false });
                    setSaveError(null);
                  }}
                >
                  <Pencil size={14} strokeWidth={2.2} />
                  Редактировать меню
                </button>
                <button style={styles.actionBtn} onClick={() => toggleStatus(r.id)}>
                  {r.status === "active" ? (
                    <>
                      <PowerOff size={14} strokeWidth={2.2} />
                      Отключить
                    </>
                  ) : (
                    <>
                      <Power size={14} strokeWidth={2.2} />
                      Включить
                    </>
                  )}
                </button>
                <button
                  style={{ ...styles.actionBtn, color: "#e07a72" }}
                  onClick={() => setConfirmDelete(r)}
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <CafeEditor
          cafe={editing}
          error={saveError}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={saveCafe}
        />
      )}

      {confirmDelete && (
        <div style={{ ...styles.overlay, alignItems: "center" }} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmIcon}>
              <Trash2 size={22} strokeWidth={2.2} />
            </div>
            <div style={styles.confirmTitle}>Удалить «{confirmDelete.name}»?</div>
            <div style={styles.confirmText}>
              Кафе и его меню будут удалены безвозвратно. Официанты этого заведения
              больше не смогут войти по своему PIN.
            </div>
            <div style={styles.confirmActions}>
              <button style={styles.confirmCancelBtn} onClick={() => setConfirmDelete(null)}>
                Оставить
              </button>
              <button style={styles.confirmDeleteBtn} onClick={() => deleteCafe(confirmDelete.id)}>
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Редактор кафе (добавление / правка меню) ------------------------------

function CafeEditor({ cafe, error, onChange, onCancel, onSave }) {
  const [showImport, setShowImport] = useState(true);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(null);

  const set = (patch) => onChange({ ...cafe, ...patch });
  const setMenu = (patch) => onChange({ ...cafe, menu: { ...cafe.menu, ...patch } });

  const addCategory = () => {
    const id = `cat${cafe.menu.categories.length + 1}`;
    setMenu({ categories: [...cafe.menu.categories, { id, name: "", icon: "package" }] });
  };
  const updateCategory = (idx, patch) => {
    const next = [...cafe.menu.categories];
    next[idx] = { ...next[idx], ...patch };
    setMenu({ categories: next });
  };
  const removeCategory = (idx) => {
    const removedId = cafe.menu.categories[idx].id;
    setMenu({
      categories: cafe.menu.categories.filter((_, i) => i !== idx),
      items: cafe.menu.items.filter((it) => it.category !== removedId),
    });
  };

  const addItem = () => {
    const id = `item${Date.now().toString().slice(-6)}`;
    const firstCat = cafe.menu.categories[0]?.id || "";
    setMenu({ items: [...cafe.menu.items, { id, name: "", price: 0, category: firstCat }] });
  };
  const updateItem = (idx, patch) => {
    const next = [...cafe.menu.items];
    next[idx] = { ...next[idx], ...patch };
    setMenu({ items: next });
  };
  const removeItem = (idx) => {
    setMenu({ items: cafe.menu.items.filter((_, i) => i !== idx) });
  };

  const [importInfo, setImportInfo] = useState(null);

  const applyImport = () => {
    let raw;
    try {
      raw = JSON.parse(importText);
    } catch (e) {
      setImportError(`Невалидный JSON: ${e.message}`);
      setImportInfo(null);
      return;
    }
    const { errors, categories, items } = validateMenuJson(raw);
    if (errors.length > 0) {
      setImportError(errors[0]);
      setImportInfo(null);
      return;
    }

    // Рубрики: добавляем только те, которых ещё нет — существующие не трогаем
    const existingCatIds = new Set(cafe.menu.categories.map((c) => c.id));
    const newCats = categories.filter((c) => !existingCatIds.has(c.id));
    const mergedCategories = [...cafe.menu.categories, ...newCats];

    // Блюда: новые id — добавляются, совпадающие id — обновляются (цена/название/рубрика)
    const itemMap = new Map(cafe.menu.items.map((it) => [it.id, it]));
    let addedCount = 0;
    let updatedCount = 0;
    items.forEach((it) => {
      if (itemMap.has(it.id)) updatedCount += 1;
      else addedCount += 1;
      itemMap.set(it.id, it);
    });
    const mergedItems = [...itemMap.values()];

    setMenu({ categories: mergedCategories, items: mergedItems });
    if (raw.name && cafe.isNew && !cafe.name.trim()) set({ name: raw.name });
    setImportError(null);
    setImportInfo(
      `Готово: добавлено рубрик — ${newCats.length}, добавлено блюд — ${addedCount}, обновлено блюд — ${updatedCount}.`
    );
    setImportText("");
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.editorModal}>
        <div style={styles.editorHeader}>
          <div style={styles.editorTitle}>
            {cafe.isNew ? "Новое кафе" : `Редактирование: ${cafe.name}`}
          </div>
          <button style={styles.iconBtn} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.editorBody}>
          <label style={styles.fieldLabel}>Название кафе</label>
          <input
            style={styles.fieldInput}
            value={cafe.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Например: Кафе Восток"
          />

          {cafe.isNew && (
            <>
              <label style={styles.fieldLabel}>PIN-код (сгенерирован автоматически)</label>
              <div style={styles.pinRow}>
                <input style={styles.fieldInput} value={cafe.pin} readOnly />
                <button
                  style={styles.iconBtnBordered}
                  onClick={() => set({ pin: generatePin([]) })}
                  aria-label="Перегенерировать PIN"
                >
                  <RefreshCw size={15} strokeWidth={2.2} />
                </button>
              </div>
            </>
          )}

          <button style={styles.importToggle} onClick={() => setShowImport((s) => !s)}>
            <Upload size={14} strokeWidth={2.2} />
            {showImport ? "Скрыть вставку кода" : "Вставить сразу много блюд кодом (JSON от DeepSeek)"}
          </button>
          {showImport && (
            <div style={styles.importBox}>
              <p style={styles.importHint}>
                Вставьте JSON целиком — новые блюда и рубрики добавятся к тем,
                что уже есть ниже, а совпадающие по id — обновятся. Уже
                введённое вручную никуда не пропадёт.
              </p>
              <textarea
                style={styles.importTextarea}
                placeholder='{"name": "...", "categories": [...], "items": [...]}'
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
          )}

          <div style={styles.sectionTitle}>Или добавляйте по одному — рубрики</div>
          <p style={styles.sectionHint}>
            Можно и так, и так одновременно: часть блюд закинуть кодом выше, часть — дописать вручную ниже.
          </p>
          {cafe.menu.categories.map((cat, idx) => {
            const Icon = iconByKey(cat.icon);
            return (
              <div key={idx} style={styles.catRow}>
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
          {cafe.menu.items.map((item, idx) => (
            <div key={idx} style={styles.itemRow}>
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
                {cafe.menu.categories.map((c) => (
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
          <button style={styles.addRowBtn} onClick={addItem} disabled={!cafe.menu.categories.length}>
            <Plus size={14} strokeWidth={2.2} />
            Добавить блюдо
          </button>

          {error && <div style={styles.saveError}>{error}</div>}
        </div>

        <div style={styles.editorFooter}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Отмена
          </button>
          <button style={styles.saveBtn} onClick={() => onSave(cafe)}>
            <Check size={16} strokeWidth={2.4} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Стили -----------------------------------------------------------------

const WINE = "#8C2F2A";
const GOLD = "#C9982E";
const INK = "#1B1918";
const PANEL = "#242120";
const PAPER = "#F4EFE6";

const styles = {
  app: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: INK,
    color: PAPER,
    minHeight: "100vh",
    maxWidth: 480,
    margin: "0 auto",
  },
  header: {
    padding: "18px 16px",
    borderBottom: "1px solid #35312e",
    position: "sticky",
    top: 0,
    background: INK,
    zIndex: 5,
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 700,
    color: PAPER,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: WINE,
    color: PAPER,
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  statCards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    background: PANEL,
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "10px 6px",
    textAlign: "center",
  },
  statValue: { fontSize: 17, fontWeight: 700, color: GOLD },
  statLabel: { fontSize: 9.5, color: "#9a938d", marginTop: 2, lineHeight: 1.2 },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: PANEL,
    border: "1px solid #3a3532",
    borderRadius: 10,
    padding: "9px 12px",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: PAPER,
    fontSize: 14,
  },
  body: {
    padding: "14px 16px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  empty: { color: "#8a8480", fontSize: 14, textAlign: "center", padding: "30px 0" },
  cafeRow: {
    background: PANEL,
    border: "1px solid #3a3532",
    borderRadius: 12,
    padding: "12px 14px",
  },
  cafeRowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  cafeName: {
    fontSize: 15,
    fontWeight: 700,
    color: PAPER,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 20,
  },
  statusActive: { background: "rgba(127,191,143,0.15)", color: "#7fbf8f" },
  statusDisabled: { background: "rgba(224,122,114,0.15)", color: "#e07a72" },
  cafeMeta: { fontSize: 12, color: "#8a8480", marginTop: 4 },
  pinBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 8,
    padding: "5px 8px",
    flexShrink: 0,
  },
  pinLabel: { fontSize: 9, color: "#6f6a65", fontWeight: 700 },
  pinValue: { fontSize: 14, color: GOLD, fontWeight: 700, letterSpacing: "0.05em" },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#8a8480",
    cursor: "pointer",
    display: "flex",
    padding: 2,
  },
  cafeActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "1px solid #3a3532",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    color: "#c9c4bf",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 20,
  },
  editorModal: {
    width: "100%",
    maxWidth: 480,
    background: PANEL,
    borderRadius: "18px 18px 0 0",
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
  },
  editorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 18px",
    borderBottom: "1px solid #3a3532",
  },
  editorTitle: { fontSize: 16, fontWeight: 700, color: PAPER },
  editorBody: { padding: "14px 18px", overflowY: "auto", flex: 1 },
  fieldLabel: { display: "block", fontSize: 12, color: "#9a938d", marginBottom: 6, marginTop: 10 },
  fieldInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 8,
    padding: "10px 12px",
    color: PAPER,
    fontSize: 14,
  },
  pinRow: { display: "flex", gap: 8 },
  iconBtnBordered: {
    background: "#1B1918",
    border: "1px solid #3a3532",
    borderRadius: 8,
    color: "#c9c4bf",
    cursor: "pointer",
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
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
    marginTop: 16,
    width: "100%",
  },
  importBox: { marginTop: 10 },
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
  importHint: {
    fontSize: 12,
    color: "#9a938d",
    lineHeight: 1.4,
    margin: "0 0 8px",
  },
  importError: { color: "#e07a72", fontSize: 12, marginTop: 6 },
  importSuccess: { color: "#7fbf8f", fontSize: 12, marginTop: 6 },
  sectionHint: {
    fontSize: 11.5,
    color: "#6f6a65",
    margin: "-4px 0 10px",
    lineHeight: 1.3,
  },
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
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: PAPER, margin: "18px 0 8px" },
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
  },
  saveError: {
    marginTop: 14,
    color: "#e07a72",
    fontSize: 13,
    background: "rgba(224,122,114,0.1)",
    border: "1px solid #b3564f",
    borderRadius: 8,
    padding: "8px 10px",
  },
  editorFooter: {
    display: "flex",
    gap: 10,
    padding: "14px 18px",
    borderTop: "1px solid #3a3532",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 10,
    border: "1px solid #3a3532",
    background: "transparent",
    color: PAPER,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  saveBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: WINE,
    color: PAPER,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  confirmModal: {
    width: "100%",
    maxWidth: 380,
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
  confirmTitle: { fontSize: 16.5, fontWeight: 700, color: PAPER, marginBottom: 8 },
  confirmText: { fontSize: 13.5, color: "#9a938d", lineHeight: 1.4, marginBottom: 20 },
  confirmActions: { display: "flex", gap: 10 },
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
};
