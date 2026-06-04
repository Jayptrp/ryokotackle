import type { SalesChannel } from "@/lib/types";

/** Display metadata for each marketplace / contact channel (client-safe). */
export const CHANNEL_META: Record<
  SalesChannel,
  { label: string; icon: string; color: string }
> = {
  shopee: { label: "Shopee", icon: "shopping_bag", color: "#EE4D2D" },
  lazada: { label: "Lazada", icon: "local_mall", color: "#00008F" },
  tiktok: { label: "TikTok", icon: "music_note", color: "#000000" },
  facebook: { label: "Facebook", icon: "thumb_up", color: "#1877F2" },
  line: { label: "LINE", icon: "chat", color: "#06C755" },
  website: { label: "เว็บไซต์", icon: "language", color: "#001e40" },
  other: { label: "อื่นๆ", icon: "link", color: "#737780" },
};
