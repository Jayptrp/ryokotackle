"use client";

import Image, { getImageProps, type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { variantUrl, type ImageVariant } from "@/lib/image-variants";

type Props = Omit<ImageProps, "src" | "alt" | "unoptimized" | "loader" | "onError"> & {
  /** Original product-media URL, as stored in the DB. */
  src: string;
  alt: string;
  /** Smaller copy to load instead of the original (see image-variants.ts). */
  variant: ImageVariant;
  /** Copy for phones, picked by the browser through <picture> (e.g. "banner-sm"). */
  mobileVariant?: ImageVariant;
};

/** Below Tailwind's `md` breakpoint. */
const PHONE = "(max-width: 767px)";

/**
 * next/image that loads a size variant of a product-media image instead of the
 * full-size original. If the variant is missing (an image uploaded before
 * variants existed and not yet backfilled) it falls back to the original, so it
 * never shows a broken image. Images without that variant — GIFs, YouTube
 * thumbnails, other folders — render the original, as before.
 */
export function VariantImage({ src, alt, variant, mobileVariant, ...rest }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const onError = useCallback(() => setFailedSrc(src), [src]);
  // An error that fires before hydration is lost (no handler attached yet).
  // Re-assigning src once mounted makes it fire again — next/image does the same.
  const refireError = useCallback((img: HTMLImageElement | null) => {
    if (img) img.src = img.src;
  }, []);

  const main = failedSrc === src ? null : variantUrl(src, variant);
  if (!main) return <Image src={src} alt={alt} unoptimized {...rest} />;

  const phone = mobileVariant ? variantUrl(src, mobileVariant) : null;
  if (!phone) return <Image src={main} alt={alt} unoptimized onError={onError} {...rest} />;

  // next/image can't render <picture>, so build the <img> from getImageProps.
  // That also skips next/image's <head> preload, which would fetch the desktop
  // size on phones — callers set fetchPriority/loading for above-the-fold images.
  const { props } = getImageProps({ src: main, alt, unoptimized: true, ...rest });
  return (
    <picture>
      <source media={PHONE} srcSet={phone} />
      <img {...props} alt={alt} ref={refireError} onError={onError} />
    </picture>
  );
}
