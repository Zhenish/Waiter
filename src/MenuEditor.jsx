import React, { useState } from "react";
import { X, Check, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "./supabaseClient";
import { validateMenu } from "../scripts/menu-utils.mjs";
import { ICON_OPTIONS, iconByKey } from "./menuIcons";

const WINE = "#8C2F2A";
const INK = "#1B1918";
const PANEL = "#242120";
const PAPER = "#F4EFE6";

// Полный редактор меню — рубрики (добавить/переименовать/удалить), блюда
// построчно и вставка целиком JSON от ИИ. Используется и в панели владельца
// сервиса (через похожий CafeEditor в OwnerDashboard.jsx), и из экрана
// администратора кафе (AdminScreen.jsx) как "расширенный режим".
export default function MenuEditor({ restaurantId, initialMenu, onClose, onSaved }) {
  const [menu, setMenu] = useState({
    categories: initialMenu?.categories || [],
    items: initialMenu?.items || [],
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(null);
  const [importInfo, setImportInfo] = useState(null);

  const addCategory = () => {
    const id = `cat${menu.categories.length + 1}-${Date.now().toString().slice(-4)}`;
    setMenu((m) => ({ ...m, categories: [...m.categories, { id, name: "", icon: "package" }] }));
  };
  const updateCategory = (idx, patch) => {
    setMenu((m) => {
      const next = [...m.categories];
      next[idx] = { ...next[idx], ...patch };
      return { ...m, categories: next };
    });
  };
  const removeCategory = (idx) => {
    setMenu((m) => {
      const removedId = m.categories[idx].id;
      return {
        categories: m.categories.filter((_, i) => i !== idx),
        items: m.items.filter((it) => it.category !== removedId),
      };
    });
  };

  const addItem = () => {
    const id = `item${Date.now().toString().slice(-6)}`;
    const firstCat = menu.categories[0]?.id || "";
    setMenu((m) => ({ ...m, items: [...m.items, { id, name: "", price: 0, category: firstCat }] }));
  };
  const updateItem = (idx, patch) => {
    setMenu((m) => {
      const next = [...m.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...m, items: next };
    });
  };
  const removeItem = (idx) => {
    setMenu((m) => ({ ...m, items: m.items.filter((_, i) => i !== idx) }));
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
    const { errors, categories, items } = validateMenu(raw, "Импорт");
    if (errors.length > 0) {
      setImportError(errors[0]);
      setImportInfo(null);
      return;
    }

    const existingCatIds = new Set(menu.categories.map((c) => c.id));
    const newCats = categories.filter((c) => !existingCatIds.has(c.id));

    const itemMap = new Map(menu.items.map((it) => [it.id, it]));
    let addedCount = 0;
    let updatedCount = 0;
    items.forEach((it) => {
      if (itemMap.has(it.id)) updatedCount += 1;
      else addedCount += 1;
      itemMap.set(it.id, it);
    });

    setMenu({ categories: [...menu.categories, ...newCats], items: [...itemMap.values()] });
    setImportError(null);
    setImportInfo(
      `Готово: добавлено рубрик — ${newCats.length}, добавлено блюд — ${addedCount}, обновлено блюд — ${updatedCount}.`
    );
    setImportText("");
  };

  const save = async () => {
    if (!menu.categories.length) {
      setError("Добавьте хотя бы одну рубрику.");
      return;
    }
    if (!menu.items.length) {
      setError("Добавьте хотя бы одно блюдо.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("restaurants")
      .update({ menu, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved(menu);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.editorModal}>
        <div style={styles.editorHeader}>
          <div style={styles.editorTitle}>Меню — редактирование</div>
          <button style={styles.iconBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.editorBody}>
          <button style={styles.importToggle} onClick={() => setShowImport((s) => !s)}>
            <Upload size={14} strokeWidth={2.2} />
            {showImport ? "Скрыть вставку кода" : "Вставить сразу много блюд кодом (JSON от DeepSeek)"}
          </button>
          {showImport && (
            <div style={styles.importBox}>
              <p style={styles.importHint}>
                Вставьте JSON целиком — новые блюда и рубрики добавятся к тем,
                что уже есть ниже, а совпадающие по id — обновятся.
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
          )}

          <div style={styles.sectionTitle}>Рубрики меню</div>
          <p style={styles.sectionHint}>
            Рубрика — это раздел меню, между которыми официант переключается
            вкладками наверху, например «Кухня», «Напитки», «Бар».
          </p>
          {menu.categories.map((cat, idx) => {
            const Icon = iconByKey(cat.icon);
            return (
              <div key={idx} style={styles.catRow}>
                <Icon size={16} strokeWidth={2.2} color="#8a8480" />
                <input
                  style={styles.catNameInput}
                  value={cat.name}
                  placeholder="Например: Кухня"
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
          {menu.items.map((item, idx) => (
            <div key={idx} style={styles.itemRow}>
              <input
                style={styles.itemNameInput}
                value={item.name}
                placeholder="Название"
                onChange={(e) => updateItem(idx, { name: e.target.value })}
              />
              <input
                style={styles.itemPriceInput}
                type="text"
                inputMode="decimal"
                value={item.price}
                onChange={(e) => updateItem(idx, { price: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
              />
              <select
                style={styles.itemCatSelect}
                value={item.category}
                onChange={(e) => updateItem(idx, { category: e.target.value })}
              >
                {menu.categories.map((c) => (
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
          <button style={styles.addRowBtn} onClick={addItem} disabled={!menu.categories.length}>
            <Plus size={14} strokeWidth={2.2} />
            Добавить блюдо
          </button>

          {error && <div style={styles.saveError}>{error}</div>}
        </div>

        <div style={styles.editorFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button style={styles.saveBtn} onClick={save} disabled={saving}>
            <Check size={16} strokeWidth={2.4} />
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  editorModal: {
    width: "100%",
    maxWidth: 480,
    background: PANEL,
    borderRadius: 18,
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    margin: "0 16px",
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
  iconBtn: { background: "none", border: "none", color: "#8a8480", cursor: "pointer", display: "flex" },
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
  },
  importBox: { marginTop: 10 },
  importTextarea: {
    width: "100%",
    boxSizing: "border-box",
    background: INK,
    border: "1px solid #3a3532",
    borderRadius: 8,
    padding: "10px 12px",
    color: PAPER,
    fontSize: 12.5,
    fontFamily: "monospace",
    resize: "vertical",
  },
  importHint: { fontSize: 12, color: "#9a938d", lineHeight: 1.4, margin: "0 0 8px" },
  importError: { color: "#e07a72", fontSize: 12, marginTop: 6 },
  importSuccess: { color: "#7fbf8f", fontSize: 12, marginTop: 6 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: PAPER, margin: "18px 0 8px" },
  sectionHint: { fontSize: 11.5, color: "#6f6a65", margin: "-4px 0 10px", lineHeight: 1.3 },
  catRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  catNameInput: {
    flex: 1,
    background: INK,
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 9px",
    color: PAPER,
    fontSize: 13,
  },
  catIconSelect: {
    background: INK,
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
    background: INK,
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 9px",
    color: PAPER,
    fontSize: 13,
    minWidth: 0,
  },
  itemPriceInput: {
    width: 64,
    background: INK,
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 6px",
    color: PAPER,
    fontSize: 13,
  },
  itemCatSelect: {
    background: INK,
    border: "1px solid #3a3532",
    borderRadius: 7,
    padding: "7px 4px",
    color: "#c9c4bf",
    fontSize: 11.5,
    maxWidth: 84,
  },
  rowDeleteBtn: { background: "none", border: "none", color: "#8a8480", cursor: "pointer", flexShrink: 0, display: "flex" },
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
  editorFooter: { display: "flex", gap: 10, padding: "14px 18px", borderTop: "1px solid #3a3532" },
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
};
