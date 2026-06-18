"use client";

import { useEffect, useRef, useState } from "react";
import { isProductNameTaken } from "@/app/admin/products/actions";
import { Icon } from "@/components/icon";

/**
 * Product name input (submits `name`) with a live duplicate check and ASCII
 * enforcement. Non-ASCII (Thai) characters are flagged inline and block submit
 * via setCustomValidity — Thai names belong in the TH field.
 */
export function ProductNameField({
  defaultValue,
  excludeId,
  onValueChange,
  modified,
}: {
  defaultValue: string;
  excludeId?: string;
  onValueChange?: (v: string) => void;
  modified?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [taken, setTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const original = useRef(defaultValue.trim().toLowerCase());
  const inputRef = useRef<HTMLInputElement>(null);

  const hasNonAscii = /[^\x00-\x7F]/.test(value);

  // Block native form submit when non-ASCII characters are present
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.setCustomValidity(
      hasNonAscii ? "ชื่อ EN ต้องเป็นภาษาอังกฤษเท่านั้น" : "",
    );
  }, [hasNonAscii]);

  useEffect(() => {
    const name = value.trim();
    if (!name || name.toLowerCase() === original.current || hasNonAscii) {
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
  }, [value, excludeId, hasNonAscii]);

  const hasError = taken || hasNonAscii;

  return (
    <div className="flex flex-col gap-1 md:col-span-2">
      <label className="font-label-caps text-label-caps text-on-surface-variant">
        ชื่อสินค้า (EN) <span className="text-error">*</span>
      </label>
      <input
        ref={inputRef}
        name="name"
        required
        value={value}
        onChange={(e) => { setValue(e.target.value); onValueChange?.(e.target.value); }}
        className={`rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none focus:ring-1 ${
          hasError
            ? "border-error focus:border-error focus:ring-error/20"
            : modified
            ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
            : "border-outline-variant focus:border-primary focus:ring-primary/20"
        }`}
        placeholder="ชื่อสินค้าภาษาอังกฤษ"
      />
      {checking && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          กำลังตรวจสอบชื่อ...
        </p>
      )}
      {hasNonAscii && (
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-error">
          <Icon name="error" className="text-base" />
          ชื่อภาษาอังกฤษเท่านั้น — ใส่ชื่อไทยในช่อง TH
        </p>
      )}
      {taken && !hasNonAscii && (
        <p className="flex items-center gap-1 font-body-sm text-body-sm text-error">
          <Icon name="error" className="text-base" />
          มีสินค้าชื่อนี้อยู่แล้ว
        </p>
      )}
    </div>
  );
}
