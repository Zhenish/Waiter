import { supabase } from "./supabaseClient";

// Кафе, к которому привязано ЭТО устройство, хранится в localStorage — чтобы
// официант вводил PIN один раз, а не при каждом открытии сайта.
const CACHE_KEY = "waiter-menu-cafe-id";

export function getCachedRestaurantId() {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch (e) {
    return null;
  }
}

export function setCachedRestaurantId(id) {
  try {
    if (id) localStorage.setItem(CACHE_KEY, id);
    else localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // приватный режим браузера и т.п. — не критично, просто будут чаще спрашивать PIN
  }
}

const DISABLED_MESSAGE =
  "Это кафе временно отключено. Обратитесь к владельцу сервиса.";

// Достаёт кафе и его меню по PIN-коду (вводит официант при первом входе)
export async function fetchRestaurantByPin(pin) {
  if (!supabase) return { error: "Сайт не настроен (нет подключения к базе)." };
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, menu, status, pin")
    .eq("pin", pin.trim())
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Неверный PIN-код. Проверьте и попробуйте снова." };
  if (data.status === "disabled") return { error: DISABLED_MESSAGE };
  return { restaurant: data };
}

// Достаёт кафе и его АКТУАЛЬНОЕ меню по сохранённому id (обычный вход,
// когда PIN уже вводили раньше на этом устройстве). Меню всегда берётся
// свежее из базы — так его можно обновлять без переустановки сайта, а если
// владелец отключил кафе — вход тоже сразу заблокируется.
export async function fetchRestaurantById(id) {
  if (!supabase) return { error: "Сайт не настроен (нет подключения к базе)." };
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, menu, status, pin")
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Это кафе больше не найдено в базе." };
  if (data.status === "disabled") return { error: DISABLED_MESSAGE };
  return { restaurant: data };
}
