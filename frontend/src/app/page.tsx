'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductGrid } from '@/components/products/ProductGrid';
import { PageSpinner } from '@/components/ui/Spinner';

export default function HomePage() {
  const { data, isLoading } = useProducts({ page: 1, limit: 8, sort: 'newest' });
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col">
      <section className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16">
          <h1 className="text-3xl font-bold sm:text-4xl">Everything you need, in one shop.</h1>
          <p className="max-w-xl text-slate-300">
            Browse our catalog of quality products, add them to your cart, and check out securely.
          </p>
          <Link
            href="/products"
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Shop now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Shop by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-900 hover:text-slate-900"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">New arrivals</h2>
          <Link href="/products" className="text-sm font-medium text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        {isLoading ? <PageSpinner /> : <ProductGrid products={data?.products ?? []} />}
      </section>
    </div>
  );
}
