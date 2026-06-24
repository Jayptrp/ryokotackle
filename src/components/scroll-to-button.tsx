"use client";

import { Icon } from "@/components/icon";

/** Smooth-scrolls to an element by id (e.g. the product description section). */
export function ScrollToButton({
  targetId,
  label,
}: {
  targetId: string;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      className="group mx-auto flex w-fit items-center justify-center gap-1 font-body-md text-body-md text-secondary transition-colors hover:text-primary"
    >
      {label}
      <Icon
        name="expand_more"
        className="text-base transition-transform group-hover:translate-y-0.5"
      />
    </button>
  );
}
