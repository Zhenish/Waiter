import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Один сайт, один билд — все 100+ кафе используют один и тот же код.
// Кафе (restaurant) теперь определяется не при сборке, а во время работы
// сайта: официант вводит PIN, по нему из базы находится нужное кафе и его
// меню. Дизайн/новые функции меняются один раз в коде и сразу видны всем.

// Если переменные не заданы — приложение покажет понятную инструкцию
// вместо падения с непонятной ошибкой (см. App.jsx).
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;
