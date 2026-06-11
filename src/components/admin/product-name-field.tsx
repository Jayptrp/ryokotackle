"use client";

import { useEffect, useRef, useState } from "react";
import { isProductNameTaken } from "@/app/admin/products/actions";
import { Icon } from "@/components/icon";

/**
 * Product name input (submits `name`) with a live duplicate check. Warns when a
 * product with the same name already exists; the unchanged existing name (when
 * editing) never warns. saveProduct enforces the same check server-side.
 */
export function ProductNameField({
  defaultValue,
  excludeId,
}: {
  defaultValue: string;
  excludeId?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [taken, setTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const original = useRef(defaultValue.trim().toLowerCase());

  useEffect(() => {
    const name = value.trim();
    if (!name || name.toLowerCase() === original.current) {
      setTaken(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      const result = await isProductNameTaken(name, excludeId);
      setTaken(result);
      setChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [value, excludeId]);

  return (
    <div className="flex flex-col gap-1 md:col-span-2">
      <label className="font-label-caps text-label-caps text-on-surface-variant">
        ชื่อสินค้า (EN) <span className="text-error">*</span>
      </label>
      <input
        name="name"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none focus:ring-1 ${
          taken
            ? "border-error focus:border-error focus:ring-error/20"
            : "border-outline-variant focus:border-primary focus:ring-primary/20"
        }`}
        placeholder="ชื่อสินค้าภาษาอังกฤษ"
      />
      {checking && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          กำลังตรวจสอบชื่อ...
        </p>
      )}
      {taken && (
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-error">
          <Icon name="error" className="text-base" />
          มีสินค้าชื่อนี้อยู่แล้ว
        </p>
      )}
    </div>
  );
}
