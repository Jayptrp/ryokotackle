import { cn } from "@/lib/utils";

/** Renders a Material Symbols (Outlined) glyph by name. */
export function Icon({
  name,
  filled,
  className,
  ...props
}: { name: string; filled?: boolean } & React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      {...props}
    >
      {name}
    </span>
  );
}
