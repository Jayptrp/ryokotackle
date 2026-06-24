import type { Locale } from "@/lib/i18n/config";

/**
 * UI-chrome translations (nav, filters, buttons, labels). Product content is
 * handled separately via per-product JSON overrides — see `product-content.ts`.
 *
 * Thai is the source. Keep every locale's shape identical to `th`; `t()` falls
 * back to Thai for any missing key. Use `{count}`-style placeholders and pass
 * values to `t(key, { count })`.
 */
export type Messages = {
  nav: {
    home: string;
    products: string;
    warranty: string;
    contact: string;
    about: string;
    categories: string;
  };
  aria: {
    search: string;
    menu: string;
    prevPage: string;
    nextPage: string;
  };
  filter: {
    all: string;
    allBrands: string;
    allSubcategories: string;
    searchPlaceholder: string;
    resultsFound: string; // "{count}"
    empty: string;
  };
  detail: {
    viewDetails: string;
    contactForMore: string;
    warrantyAsk: string;
    orderChannels: string;
    interested: string;
    inquireOrder: string;
    productDetails: string;
  };
  home: {
    categories: string;
    viewAll: string;
    featured: string;
    featuredSubtitle: string;
  };
};

const th: Messages = {
  nav: {
    home: "หน้าแรก",
    products: "สินค้าทั้งหมด",
    warranty: "ประกันและอะไหล่",
    contact: "ติดต่อเรา",
    about: "เกี่ยวกับเรา",
    categories: "หมวดหมู่",
  },
  aria: {
    search: "ค้นหา",
    menu: "เมนู",
    prevPage: "ก่อนหน้า",
    nextPage: "ถัดไป",
  },
  filter: {
    all: "ทั้งหมด",
    allBrands: "ทุกแบรนด์",
    allSubcategories: "ทุกหมวดหมู่ย่อย",
    searchPlaceholder: "ค้นหาสินค้า...",
    resultsFound: "พบ {count} รายการ",
    empty: "ไม่พบสินค้าที่ตรงกับเงื่อนไข",
  },
  detail: {
    viewDetails: "ดูรายละเอียดสินค้า",
    contactForMore: "ติดต่อทางบริษัทเพื่อขอรายละเอียดเพิ่มเติม",
    warrantyAsk: "สอบถามข้อมูลการรับประกัน",
    orderChannels: "ช่องทางการสั่งซื้อ",
    interested:
      "สนใจสินค้าชิ้นนี้? ติดต่อทีมงานเพื่อสอบถามราคาและช่องทางการสั่งซื้อ",
    inquireOrder: "สอบถาม / สั่งซื้อ",
    productDetails: "รายละเอียดสินค้า",
  },
  home: {
    categories: "หมวดหมู่สินค้า",
    viewAll: "ดูทั้งหมด",
    featured: "สินค้าแนะนำ",
    featuredSubtitle: "อุปกรณ์ที่ทีมงานคัดสรร",
  },
};

const en: Messages = {
  nav: {
    home: "Home",
    products: "All Products",
    warranty: "Warranty & Parts",
    contact: "Contact",
    about: "About",
    categories: "Categories",
  },
  aria: {
    search: "Search",
    menu: "Menu",
    prevPage: "Previous",
    nextPage: "Next",
  },
  filter: {
    all: "All",
    allBrands: "All brands",
    allSubcategories: "All subcategories",
    searchPlaceholder: "Search products...",
    resultsFound: "{count} items found",
    empty: "No products match your filters",
  },
  detail: {
    viewDetails: "View product details",
    contactForMore: "Contact us for more details",
    warrantyAsk: "Ask about warranty",
    orderChannels: "Where to buy",
    interested:
      "Interested in this product? Contact our team for pricing and where to buy.",
    inquireOrder: "Inquire / Order",
    productDetails: "Product details",
  },
  home: {
    categories: "Product Categories",
    viewAll: "View all",
    featured: "Featured Products",
    featuredSubtitle: "Gear hand-picked by our team",
  },
};

const vi: Messages = {
  nav: {
    home: "Trang chủ",
    products: "Tất cả sản phẩm",
    warranty: "Bảo hành & Phụ tùng",
    contact: "Liên hệ",
    about: "Giới thiệu",
    categories: "Danh mục",
  },
  aria: {
    search: "Tìm kiếm",
    menu: "Menu",
    prevPage: "Trước",
    nextPage: "Sau",
  },
  filter: {
    all: "Tất cả",
    allBrands: "Tất cả thương hiệu",
    allSubcategories: "Tất cả danh mục con",
    searchPlaceholder: "Tìm sản phẩm...",
    resultsFound: "Tìm thấy {count} sản phẩm",
    empty: "Không có sản phẩm phù hợp",
  },
  detail: {
    viewDetails: "Xem chi tiết sản phẩm",
    contactForMore: "Liên hệ với chúng tôi để biết thêm chi tiết",
    warrantyAsk: "Hỏi về bảo hành",
    orderChannels: "Nơi mua hàng",
    interested:
      "Quan tâm đến sản phẩm này? Liên hệ đội ngũ của chúng tôi để biết giá và nơi mua.",
    inquireOrder: "Hỏi / Đặt mua",
    productDetails: "Chi tiết sản phẩm",
  },
  home: {
    categories: "Danh mục sản phẩm",
    viewAll: "Xem tất cả",
    featured: "Sản phẩm nổi bật",
    featuredSubtitle: "Đồ nghề do đội ngũ tuyển chọn",
  },
};

const id: Messages = {
  nav: {
    home: "Beranda",
    products: "Semua Produk",
    warranty: "Garansi & Suku Cadang",
    contact: "Kontak",
    about: "Tentang",
    categories: "Kategori",
  },
  aria: {
    search: "Cari",
    menu: "Menu",
    prevPage: "Sebelumnya",
    nextPage: "Berikutnya",
  },
  filter: {
    all: "Semua",
    allBrands: "Semua merek",
    allSubcategories: "Semua subkategori",
    searchPlaceholder: "Cari produk...",
    resultsFound: "{count} produk ditemukan",
    empty: "Tidak ada produk yang cocok",
  },
  detail: {
    viewDetails: "Lihat detail produk",
    contactForMore: "Hubungi kami untuk detail lebih lanjut",
    warrantyAsk: "Tanya tentang garansi",
    orderChannels: "Tempat membeli",
    interested:
      "Tertarik dengan produk ini? Hubungi tim kami untuk harga dan tempat membeli.",
    inquireOrder: "Tanya / Pesan",
    productDetails: "Detail produk",
  },
  home: {
    categories: "Kategori Produk",
    viewAll: "Lihat semua",
    featured: "Produk Pilihan",
    featuredSubtitle: "Perlengkapan pilihan tim kami",
  },
};

const ms: Messages = {
  nav: {
    home: "Laman Utama",
    products: "Semua Produk",
    warranty: "Waranti & Alat Ganti",
    contact: "Hubungi",
    about: "Tentang",
    categories: "Kategori",
  },
  aria: {
    search: "Cari",
    menu: "Menu",
    prevPage: "Sebelumnya",
    nextPage: "Seterusnya",
  },
  filter: {
    all: "Semua",
    allBrands: "Semua jenama",
    allSubcategories: "Semua subkategori",
    searchPlaceholder: "Cari produk...",
    resultsFound: "{count} item dijumpai",
    empty: "Tiada produk yang sepadan",
  },
  detail: {
    viewDetails: "Lihat butiran produk",
    contactForMore: "Hubungi kami untuk butiran lanjut",
    warrantyAsk: "Tanya tentang waranti",
    orderChannels: "Tempat membeli",
    interested:
      "Berminat dengan produk ini? Hubungi pasukan kami untuk harga dan tempat membeli.",
    inquireOrder: "Tanya / Pesan",
    productDetails: "Butiran produk",
  },
  home: {
    categories: "Kategori Produk",
    viewAll: "Lihat semua",
    featured: "Produk Pilihan",
    featuredSubtitle: "Kelengkapan pilihan pasukan kami",
  },
};

export const MESSAGES: Record<Locale, Messages> = { th, en, vi, id, ms };
