"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

interface Props {
  total: number;
  noImage: number;
  noNameTh: number;
  noSummary: number;
  noDescription: number;
}

export function SeoSummaryCards(props: Props) {
  const [open, setOpen] = useState(true);

  const cards = [
    { label: "สินค้าเผยแพร่",   value: props.total,           icon: "inventory_2", accent: false },
    { label: "ไม่มีรูป",         value: props.noImage,         icon: "hide_image",  accent: props.noImage > 0 },
    { label: "ไม่มีชื่อไทย",     value: props.noNameTh,        icon: "translate",   accent: props.noNameTh > 0 },
    { label: "ไม่มีสรุป",        value: props.noSummary,       icon: "short_text",  accent: props.noSummary > 0 },
    { label: "ไม่มีรายละเอียด", value: props.noDescription,   icon: "article",     accent: props.noDescription > 0 },
  ];

  return (
    <div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-surface-container"
      >
        <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant/70">
          ภาพรวมสินค้า — การมีชื่อไทย สรุป และรายละเอียด จะช่วยเพิ่มประสิทธิภาพ SEO
        </span>
        <Icon
          name="expand_more"
          className={`text-xl text-on-surface-variant transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border p-4 ${
                card.accent
                  ? "border-error/30 bg-error-container/20"
                  : "border-outline-variant bg-surface-container"
              }`}
            >
              <Icon
                name={card.icon}
                className={`mb-1 text-lg ${card.accent ? "text-error" : "text-on-surface-variant"}`}
              />
              <p className={`font-headline-md text-headline-md ${card.accent ? "text-error" : "text-primary"}`}>
                {card.value}
              </p>
              <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
