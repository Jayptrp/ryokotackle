export type CategorySlug =
  | "rods"
  | "reels"
  | "lures"
  | "apparel"
  | "accessories";

export interface Category {
  slug: CategorySlug;
  /** Thai label shown in the UI, e.g. "คันเบ็ด (Rods)" */
  label: string;
  /** Material Symbols icon name */
  icon: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  /** Short uppercase overline shown on cards, e.g. "NEW ARRIVAL" */
  badge?: string;
  price: number;
  compareAtPrice?: number;
  /** Primary image URL */
  image: string;
  /** Gallery images (defaults to [image] when absent) */
  images?: string[];
  /** Paragraphs of long-form description (Thai) */
  description: string[];
  specs: ProductSpec[];
  videoTitle?: string;
}
