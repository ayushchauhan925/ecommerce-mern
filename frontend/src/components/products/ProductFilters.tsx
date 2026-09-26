'use client';

import { useRef } from 'react';
import { Search } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { ProductQueryOptions } from '@/lib/types';

function useDebounced(fn: () => void, delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
  };
}

export function ProductFilters({
  filters,
  onChange,
}: {
  filters: ProductQueryOptions;
  onChange: (patch: Partial<ProductQueryOptions>) => void;
}) {
  const { data: categories } = useCategories();
  const searchRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounced(() =>
    onChange({ search: searchRef.current?.value || undefined, page: 1 }),
  );
  const debouncedPrice = useDebounced(() =>
    onChange({
      minPrice: minRef.current?.value ? Number(minRef.current.value) : undefined,
      maxPrice: maxRef.current?.value ? Number(maxRef.current.value) : undefined,
      page: 1,
    }),
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[200px] flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search products..."
          defaultValue={filters.search ?? ''}
          onChange={debouncedSearch}
          className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <select
        value={filters.category ?? ''}
        onChange={(e) => onChange({ category: e.target.value || undefined, page: 1 })}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="">All categories</option>
        {categories?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        ref={minRef}
        type="number"
        min={0}
        placeholder="Min price"
        defaultValue={filters.minPrice ?? ''}
        onChange={debouncedPrice}
        className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <input
        ref={maxRef}
        type="number"
        min={0}
        placeholder="Max price"
        defaultValue={filters.maxPrice ?? ''}
        onChange={debouncedPrice}
        className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <select
        value={filters.sort ?? 'newest'}
        onChange={(e) => onChange({ sort: e.target.value as ProductQueryOptions['sort'] })}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  );
}
