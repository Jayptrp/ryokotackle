import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { variantPath, variantsForPath } from "@/lib/image-variants";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_VARIANT_SIZE = 5 * 1024 * 1024; // variants are ≤1600px JPEGs, far below this

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient();

  // Auth check — the admin layout guards /admin pages, but this API route is a
  // separate entry point (no layout above it), so re-check here.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const productId = formData.get("productId") as string;
  const folder = (formData.get("folder") as string) ?? "media";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${productId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("product-media")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Size variants made in the admin's browser (see image-variants.ts). Only the
  // ones this folder uses are stored. Best effort: if one is missing, public
  // pages fall back to the original.
  await Promise.all(
    variantsForPath(path).map(async (name) => {
      const variant = formData.get(`variant:${name}`);
      if (!(variant instanceof File) || variant.type !== "image/jpeg" || variant.size > MAX_VARIANT_SIZE)
        return;
      const { error: variantError } = await supabase.storage
        .from("product-media")
        .upload(variantPath(path, name), variant, { upsert: false, contentType: "image/jpeg" });
      if (variantError) console.error(`Variant "${name}" upload failed for ${path}: ${variantError.message}`);
    }),
  );

  const { data: { publicUrl } } = supabase.storage
    .from("product-media")
    .getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
