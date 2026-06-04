"use client";

import { useTransition } from "react";
import { saveDescription } from "@/app/admin/products/actions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Icon } from "@/components/icon";

interface Props {
  productId: string;
  description: string | null;
}

export function DescriptionForm({ productId, description }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => saveDescription(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={productId} />
      <TiptapEditor
        name="description"
        defaultValue={description}
        productId={productId}
      />
      <button
        type="submit"
        disabled={isPending}
        className="self-start flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
      >
        {isPending ? (
          <Icon name="hourglass_top" className="animate-spin text-base" />
        ) : (
          <Icon name="save" className="text-base" />
        )}
        บันทึกรายละเอียด
      </button>
    </form>
  );
}
