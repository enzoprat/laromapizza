export type OrderType = "pickup" | "delivery";

export type OrderStatus =
  | "received" | "accepted" | "preparing" | "ready"
  | "delivering" | "completed" | "delivered" | "cancelled";

export type Restaurant = {
  id: number;
  slug: string;
  name: string;
  city: string;
  street: string;
  postal_code: string;
  phone: string;
  mobile: string | null;
  photo: string | null;
  neighbourhood: string | null;
  prep_time_min: number;
  delivery_time_min: number;
  slot_interval_min: number;
  slot_capacity: number;
  delivery_min_lunch: number;
  delivery_min_dinner: number;
  delivery_fee: number;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  online_payment_enabled: boolean;
  accepting_orders: boolean;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_intro: string | null;
  rating: string | number | null;
  rating_count: number | null;
  position: number;
};

export type Variant = {
  id: number;
  name: string;
  short_name: string | null;
  price: number;
  size_code: string | null;
  is_default: boolean;
};

export type OptionChoice = {
  id: number;
  name: string;
  price_delta: number;
  is_default: boolean;
};

export type OptionGroup = {
  id: number;
  slug: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  options: OptionChoice[];
};

export type Extra = {
  id: number;
  slug: string;
  name: string;
  category: string;
  price_by_size: Record<string, number>;
  price_default: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  is_new: boolean;
  is_popular: boolean;
  is_vegetarian: boolean;
  is_halal: boolean;
  kind: "simple" | "pizza" | "menu";
  evening_surcharge: number;
  availability: "all" | "pickup" | "delivery";
  allergens: string[];
  out_of_stock: boolean;
  variants: Variant[];
  optionGroups: OptionGroup[];
  extras: Extra[];
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  products: Product[];
};

export type Menu = { categories: Category[] };
