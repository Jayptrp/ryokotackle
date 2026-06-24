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
  /** Optional disclaimer shown between the header and products on the category page. */
  disclaimer: string | null;
  /** Admin-uploaded 3:1 banner shown above this category's featured products on the homepage. */
  featuredBannerUrl: string | null;
  children?: Category[];
}

/** A top-level category's featured products on the homepage, with its banner. */
export interface FeaturedCategoryGroup {
  slug: string;
  name: string;
  nameTh: string | null;
  /** Optional 3:1 banner shown above the product list (null = no banner). */
  bannerUrl: string | null;
  products: ProductListItem[];
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
  /** Product the slide links to when clicked (independent of image backing). */
  linkProductId: string | null;
  /** Slug of `linkProductId`'s product, for building the click-through href. */
  linkProductSlug: string | null;
}

/** A warranty type — doubles as a product tag and carries the detail shown on
 * the public warranty page. */
export interface Warranty {
  id: string;
  name: string;
  detail: string | null;
  /** Material Symbols ligature for the badge icon. */
  icon: string;
  /** Color key from `src/lib/warranty-style.ts` (blue | red | navy | accent | neutral). */
  color: string;
  sortOrder: number;
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
  brand: { slug: string; name: string } | null;
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
  /** Non-Thai translations of `summary`, keyed by locale (en/vi/id/ms). */
  summaryI18n: Record<string, string>;
  /** Non-Thai translations of `description`, keyed by locale (en/vi/id/ms). */
  descriptionI18n: Record<string, string>;
  status: ProductStatus;
  isFeatured: boolean;
  category: Category | null;
  media: ProductMedia[];
  channels: ProductChannel[];
  /** Warranty tags assigned to this product (0..n). */
  warranties: Pick<Warranty, "id" | "name" | "icon" | "color">[];
}

export interface ProductQuery {
  category?: string;
  subcategory?: string;
  q?: string;
  sort?: "name" | "newest";
  page?: number;
  pageSize?: number;
}

/** Editable content for the public "ติดต่อเรา" (Contact) page (single row). */
export interface ContactPage {
  intro: string | null;
  locationDesc: string | null;
  address: string | null;
  mapLat: number | null;
  mapLng: number | null;
}

/** An admin-managed contact info card (icon + label + value). */
export interface ContactCard {
  id: string;
  icon: string;
  label: string;
  value: string;
}
