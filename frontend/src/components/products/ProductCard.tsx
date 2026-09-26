import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { ProductResponse } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function ProductCard({ product }: { product: ProductResponse }) {
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-slate-100">
        {image ? (
          <Image
            src={image.url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageOff size={32} />
          </div>
        )}
        {product.stock === 0 && (
          <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-2 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.category && (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {product.category.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</h3>
        <div className="mt-auto pt-2 text-base font-bold text-slate-900">
          {formatCurrency(product.price)}
        </div>
      </div>
    </Link>
  );
}
