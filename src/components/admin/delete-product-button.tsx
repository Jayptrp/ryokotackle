"use client";

import { useTransition } from "react";
import { deleteProduct } from "@/app/admin/products/actions";
import { Icon } from "@/components/icon";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`ลบ "${name}" จริงหรือ?`)) return;
    startTransition(() => deleteProduct(id));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 rounded-lg border border-error px-6 py-2.5 font-label-caps text-label-caps text-error transition-colors hover:bg-error hover:text-on-error disabled:opacity-50"
    >
      {isPending ? (
        <Icon name="hourglass_top" className="animate-spin text-base" />
      ) : (
        <Icon name="delete" className="text-base" />
      )}
      ลบสินค้า
    </button>
  );
}
