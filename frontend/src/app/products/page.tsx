'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters } from '@/components/products/ProductFilters';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ProductQueryOptions, ProductSort } from '@/lib/types';

function parseFilters(params: URLSearchParams): ProductQueryOptions {
  return {
    page: params.get('page') ? Number(params.get('page')) : 1,
    limit: 20,
    search: params.get('search') ?? undefined,
    category: params.get('category') ?? undefined,
    minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    sort: (params.get('sort') as ProductSort) ?? 'newest',
  };
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);

  const { data, isLoading, isFetching } = useProducts(filters);

  function handleChange(patch: Partial<ProductQueryOptions>) {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.category) params.set('category', next.category);
    if (next.minPrice != null) params.set('minPrice', String(next.minPrice));
    if (next.maxPrice != null) params.set('maxPrice', String(next.maxPrice));
    if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Products</h1>
      <div className="mb-6">
        <ProductFilters filters={filters} onChange={handleChange} />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {data?.total ?? 0} product{data?.total === 1 ? '' : 's'} found
            {isFetching && ' · updating...'}
          </p>
          <ProductGrid products={data?.products ?? []} />
          <Pagination
            page={data?.page ?? 1}
            totalPages={data?.totalPages ?? 1}
            onChange={(page) => handleChange({ page })}
          />
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProductsPageContent />
    </Suspense>
  );
}
