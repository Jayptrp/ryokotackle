import type { Database } from "@/lib/database.types";

export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type MediaType = Database["public"]["Enums"]["media_type"];
export type MediaProvider = Database["public"]["Enums"]["media_provider"];
export type SalesChannel = Database["public"]["Enums"]["sales_channel"];

export interface Brand {
  id: string;
  slug: string;
  name: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameTh: string | null;
  parentSlug: string | null;
  icon: string | null;
  sortOrder: number;
  children?: Category[];
}

export interface ProductMedia {
  id: string;
  type: MediaType;
  provider: MediaProvider | null;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductChannel {
  id: string;
  channel: SalesChannel;
  url: string;
  sortOrder: number;
}

/** Lightweight shape used in listings / cards. */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  nameTh: string | null;
  summary: string | null;
  status: ProductStatus;
  brand: Pick<Brand, "slug" | "name"> | null;
  category: Pick<Category, "slug" | "name"> | null;
  primaryImage: string | null;
}

/** Full product detail. */
export interface Product {
  id: string;
  slug: string;
  name: string;
  nameTh: string | null;
  summary: string | null;
  description: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  brand: Brand | null;
  category: Category | null;
  media: ProductMedia[];
  channels: ProductChannel[];
}

export interface ProductQuery {
  category?: string;
  brand?: string;
  q?: string;
  sort?: "name" | "newest";
  page?: number;
  pageSize?: number;
}
