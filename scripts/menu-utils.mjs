// Общая проверка структуры меню. label используется только в сообщениях об ошибках,
// чтобы было понятно, в каком именно файле проблема.
//
// Формат меню — произвольные рубрики (не только "еда"/"бар"), например:
// {
//   "categories": [
//     { "id": "food", "name": "Еда", "icon": "utensils" },
//     { "id": "bar", "name": "Бар", "icon": "wine" },
//     { "id": "hookah", "name": "Кальян", "icon": "flame" }
//   ],
//   "items": [
//     { "id": "f1", "name": "Плов", "price": 420, "category": "food" }
//   ]
// }

export function validateMenu(raw, label) {
  const errors = [];

  const categories = raw.categories;
  const items = raw.items;

  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push(`${label}: поле "categories" должно быть непустым массивом рубрик.`);
    return { errors };
  }
  if (!Array.isArray(items)) {
    errors.push(`${label}: поле "items" должно быть массивом блюд.`);
    return { errors };
  }
  if (items.length === 0) {
    errors.push(`${label}: меню пустое — добавь хотя бы одно блюдо в "items".`);
    return { errors };
  }

  const seenCatIds = new Set();
  for (const cat of categories) {
    if (!cat.id || typeof cat.id !== "string") {
      errors.push(`${label}: у рубрики должен быть строковый "id". Проблема в: ${JSON.stringify(cat)}`);
      continue;
    }
    if (!cat.name || typeof cat.name !== "string") {
      errors.push(`${label}: у рубрики "${cat.id}" должно быть название "name" (строка).`);
    }
    if (seenCatIds.has(cat.id)) {
      errors.push(`${label}: id рубрики "${cat.id}" повторяется дважды.`);
    }
    seenCatIds.add(cat.id);
  }

  const seenItemIds = new Set();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      errors.push(`${label}: у каждого блюда должен быть строковый "id". Проблема в: ${JSON.stringify(item)}`);
      continue;
    }
    if (!item.name || typeof item.name !== "string") {
      errors.push(`${label}: у блюда "${item.id}" должно быть название "name" (строка).`);
    }
    if (typeof item.price !== "number" || item.price < 0) {
      errors.push(`${label}: у блюда "${item.id}" ("${item.name}") цена "price" должна быть числом (не строкой, без кавычек).`);
    }
    if (!item.category || typeof item.category !== "string") {
      errors.push(`${label}: у блюда "${item.id}" ("${item.name}") должно быть поле "category".`);
    } else if (!seenCatIds.has(item.category)) {
      errors.push(`${label}: у блюда "${item.id}" ("${item.name}") указана рубрика "${item.category}", которой нет в "categories".`);
    }
    if (seenItemIds.has(item.id)) {
      errors.push(`${label}: id "${item.id}" повторяется дважды — id блюд должны быть уникальны в пределах одного меню.`);
    }
    seenItemIds.add(item.id);
  }

  return { errors, categories, items };
}

export function menuToModuleSource(menu) {
  return (
    `// Автоматически сгенерировано scripts/build-all.mjs — не редактировать руками,\n` +
    `// править нужно соответствующий файл в menus/.\n` +
    `export const CATEGORIES = ${JSON.stringify(menu.categories, null, 2)};\n\n` +
    `export const ITEMS = ${JSON.stringify(menu.items, null, 2)};\n`
  );
}

// id кафе используется и в базе данных, и в адресе сайта — должен быть "безопасным":
// только латинские строчные буквы, цифры и дефисы.
export function isValidCafeId(id) {
  return typeof id === "string" && /^[a-z0-9-]+$/.test(id);
}
