import { cn } from "@/lib/utils";

/** Centered content wrapper (max width = --container-max) with the standard responsive gutters. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[var(--container-max)] px-margin-mobile md:px-margin-desktop",
        className,
      )}
      {...props}
    />
  );
}
