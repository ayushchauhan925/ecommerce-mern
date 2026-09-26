'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { ImageOff, Plus, Pencil, Trash2 } from 'lucide-react';
import { useDeleteProduct, useProducts } from '@/hooks/useProducts';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProducts({ page, limit: 15, sort: 'newest' });
  const deleteProduct = useDeleteProduct();

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteProduct.mutate(id, {
      onSuccess: () => toast.success('Product deleted'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not delete product')),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <Plus size={16} /> New product
        </Link>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data || data.products.length === 0 ? (
        <EmptyState title="No products yet" description="Create your first product to get started." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 last:border-0">
                  <td className="flex items-center gap-3 px-4 py-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                      {product.images[0] ? (
                        <Image src={product.images[0].url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <ImageOff size={14} />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-slate-900">{product.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{product.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3 text-slate-600">{product.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
