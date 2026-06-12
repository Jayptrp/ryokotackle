import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { ProductListItem } from "@/lib/types";

export function ProductCard({
  product,
  className,
}: {
  product: ProductListItem;
  className?: string;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group block cursor-pointer", className)}
    >
      <div className="mb-stack-md aspect-square overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low transition-all duration-500">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.name}
            width={600}
            height={600}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high">
            <Icon
              name="image"
              className="text-5xl text-outline-variant transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-secondary">
          {product.category?.name ?? "RYOKO"}
        </span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        {product.category && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {product.category.nameTh ?? product.category.name}
          </p>
        )}
      </div>
    </Link>
  );
}
