"use client";

import { useState, useTransition } from "react";
import { saveChannels } from "@/app/admin/products/actions";
import { CHANNEL_META } from "@/lib/channels";
import { Icon } from "@/components/icon";
import type { SalesChannel } from "@/lib/types";

const CHANNELS = Object.entries(CHANNEL_META) as [SalesChannel, { label: string; icon: string; color: string }][];

interface ChannelRow {
  channel: SalesChannel;
  url: string;
}

interface Props {
  productId: string;
  initial: ChannelRow[];
}

export function ChannelManager({ productId, initial }: Props) {
  const [rows, setRows] = useState<ChannelRow[]>(
    initial.length ? initial : [{ channel: "shopee", url: "" }],
  );
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function add() {
    const used = new Set(rows.map((r) => r.channel));
    const next = CHANNELS.find(([ch]) => !used.has(ch));
    if (next) setRows([...rows, { channel: next[0], url: "" }]);
  }

  function remove(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  function save() {
    startTransition(async () => {
      await saveChannels(productId, rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const meta = CHANNEL_META[row.channel];
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: meta.color }}
            >
              <Icon name={meta.icon} className="text-base" />
            </span>
            <select
              value={row.channel}
              onChange={(e) =>
                setRows(rows.map((r, idx) => idx === i ? { ...r, channel: e.target.value as SalesChannel } : r))
              }
              className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
            >
              {CHANNELS.map(([ch, m]) => (
                <option key={ch} value={ch}>{m.label}</option>
              ))}
            </select>
            <input
              type="url"
              value={row.url}
              onChange={(e) =>
                setRows(rows.map((r, idx) => idx === i ? { ...r, url: e.target.value } : r))
              }
              placeholder="https://..."
              className="flex-1 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-error"
            >
              <Icon name="delete" className="text-base" />
            </button>
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        {rows.length < CHANNELS.length && (
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-colors hover:text-on-secondary-container"
          >
            <Icon name="add" className="text-base" />
            เพิ่มช่องทาง
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="ml-auto flex items-center gap-1 rounded-lg bg-secondary px-4 py-2 font-label-caps text-label-caps text-on-secondary transition-colors hover:bg-on-secondary-container disabled:opacity-50"
        >
          {isPending ? (
            <Icon name="hourglass_top" className="animate-spin text-base" />
          ) : saved ? (
            <Icon name="check" className="text-base" />
          ) : (
            <Icon name="save" className="text-base" />
          )}
          {saved ? "บันทึกแล้ว" : "บันทึกช่องทาง"}
        </button>
      </div>
    </div>
  );
}
