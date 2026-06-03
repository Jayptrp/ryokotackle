import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatTHB } from "@/lib/products";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("product-card group block cursor-pointer", className)}
    >
      <div className="mb-stack-md aspect-[4/5] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low transition-all duration-500">
        <Image
          src={product.image}
          alt={product.name}
          width={600}
          height={750}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          unoptimized
        />
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "font-label-caps text-label-caps",
            product.badge ? "text-secondary" : "text-on-surface-variant",
          )}
        >
          {product.badge ?? product.category.toUpperCase()}
        </span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <p className="font-headline-sm text-headline-sm font-bold text-primary">
          {formatTHB(product.price)}
        </p>
      </div>
    </Link>
  );
}
