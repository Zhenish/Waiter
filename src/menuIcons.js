import {
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
} from "lucide-react";

// Единый набор иконок рубрик — используется и в панели владельца, и в
// админке кафе, и в самом меню официанта (see CLAUDE.md: CATEGORY_ICONS).
export const ICON_OPTIONS = [
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

export const iconByKey = (key) => ICON_OPTIONS.find((o) => o.key === key)?.Icon || Package;
