import type { Database } from "@/lib/database.types";

export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type MediaType = Database["public"]["Enums"]["media_type"];
export type MediaProvider = Database["public"]["Enums"]["media_provider"];
export type SalesChannel = Database["public"]["Enums"]["sales_channel"];

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameTh: string | null;
  parentSlug: string | null;
  icon: string | null;
  sortOrder: number;
  /** Admin-uploaded background image for the homepage category card. */
  imageUrl: string | null;
  /** Product whose primary image backs the card when no image is uploaded. */
  imageProductId: string | null;
  children?: Category[];
}

/** Top-level category enriched with a resolved homepage card background. */
export interface CategoryCard {
  slug: string;
  name: string;
  nameTh: string | null;
  icon: string | null;
  /** Resolved background: uploaded → selected product → auto-picked product. */
  backgroundImage: string | null;
}

/** Editable hero carousel slide (uploaded image, or backed by a product). */
export interface CarouselSlide {
  id: string;
  /** Resolved image: the product's primary image, or the uploaded image_url. */
  imageUrl: string;
  /** Resolved title: the product name (locked) for product slides, else editable. */
  title: string | null;
  subtitle: string | null;
  sortOrder: number;
  /** Non-null when the slide is backed by a product (title is locked). */
  productId: string | null;
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
  category: Pick<Category, "slug" | "name" | "nameTh"> | null;
  primaryImage: string | null;
  createdAt: string;
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
  category: Category | null;
  media: ProductMedia[];
  channels: ProductChannel[];
}

export interface ProductQuery {
  category?: string;
  subcategory?: string;
  q?: string;
  sort?: "name" | "newest";
  page?: number;
  pageSize?: number;
}
