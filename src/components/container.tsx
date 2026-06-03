import { cn } from "@/lib/utils";

/** Centered, max-1280px content wrapper with the standard responsive gutters. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1280px] px-margin-mobile md:px-margin-desktop",
        className,
      )}
      {...props}
    />
  );
}
