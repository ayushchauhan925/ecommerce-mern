'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ProductForm, ProductFormValues } from '@/components/admin/ProductForm';
import { ProductImageManager } from '@/components/admin/ProductImageManager';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { getErrorMessage } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct(id);
  const router = useRouter();

  if (isLoading) return <PageSpinner />;

  if (!product) {
    return (
      <div className="max-w-xl">
        <EmptyState title="Product not found" />
      </div>
    );
  }

  function handleSubmit(values: ProductFormValues) {
    updateProduct.mutate(values, {
      onSuccess: () => toast.success('Product updated'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not update product')),
    });
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        <button
          onClick={() => router.push('/admin/products')}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Back to products
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Images</h2>
        <ProductImageManager productId={product.id} images={product.images} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ProductForm
          initial={product}
          onSubmit={handleSubmit}
          submitting={updateProduct.isPending}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
