// Простая защита панели владельца: пароль сверяется с VITE_OWNER_PASSWORD.
//
// ВАЖНО — честно про уровень защиты: это НЕ настоящая авторизация. Пароль
// и anon-ключ Supabase всё равно попадают в собранный JS-файл сайта, а
// текущие политики Supabase (RLS "using (true)") разрешают читать и менять
// таблицу restaurants всем, у кого есть этот ключ — независимо от того, ввели
// они пароль на этом экране или нет. Экран пароля защищает только от
// случайного захода не туда, а не от целенаправленного доступа к базе в обход
// сайта. Для настоящей защиты нужен Supabase Auth и RLS-политики по
// авторизованному пользователю — см. README.

const UNLOCK_KEY = "waiter-menu-owner-unlocked";

export function isOwnerPasswordConfigured() {
  return Boolean(import.meta.env.VITE_OWNER_PASSWORD);
}

export function isOwnerUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === "true";
  } catch (e) {
    return false;
  }
}

export function tryUnlockOwner(password) {
  const expected = import.meta.env.VITE_OWNER_PASSWORD;
  if (!expected) return false;
  const ok = password === expected;
  if (ok) {
    try {
      localStorage.setItem(UNLOCK_KEY, "true");
    } catch (e) {
      // не критично — просто будет спрашивать пароль каждый раз
    }
  }
  return ok;
}

export function lockOwner() {
  try {
    localStorage.removeItem(UNLOCK_KEY);
  } catch (e) {
    // ничего страшного
  }
}
