"use client";

import { CHANNEL_META } from "@/lib/channels";
import { Icon } from "@/components/icon";
import type { SalesChannel } from "@/lib/types";

const CHANNELS = Object.entries(CHANNEL_META) as [SalesChannel, { label: string; icon: string; color: string }][];

export interface ChannelRow {
  channel: SalesChannel;
  url: string;
}

interface Props {
  rows: ChannelRow[];
  onRowsChange: (rows: ChannelRow[]) => void;
}

export function ChannelManager({ rows, onRowsChange }: Props) {
  function add() {
    const used = new Set(rows.map((r) => r.channel));
    const next = CHANNELS.find(([ch]) => !used.has(ch));
    if (next) {
      const channel = next[0];
      const url = channel === "facebook" ? "https://www.facebook.com/ryoko.tackle" : "";
      onRowsChange([...rows, { channel, url }]);
    }
  }

  function remove(i: number) {
    onRowsChange(rows.filter((_, idx) => idx !== i));
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
              onChange={(e) => {
                const newChannel = e.target.value as SalesChannel;
                onRowsChange(
                  rows.map((r, idx) =>
                    idx === i
                      ? {
                          ...r,
                          channel: newChannel,
                          url: newChannel === "facebook" && !r.url ? "https://www.facebook.com/ryoko.tackle" : r.url,
                        }
                      : r
                  )
                );
              }}
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
                onRowsChange(rows.map((r, idx) => idx === i ? { ...r, url: e.target.value } : r))
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

      {rows.length < CHANNELS.length && (
        <button
          type="button"
          onClick={add}
          className="flex w-fit items-center gap-1 font-label-caps text-label-caps text-secondary transition-colors hover:text-on-secondary-container"
        >
          <Icon name="add" className="text-base" />
          เพิ่มช่องทาง
        </button>
      )}
    </div>
  );
}
