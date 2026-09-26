'use client';

import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ProductForm, ProductFormValues } from '@/components/admin/ProductForm';
import { useCreateProduct } from '@/hooks/useProducts';
import { getErrorMessage } from '@/lib/api';

export default function NewProductPage() {
  const createProduct = useCreateProduct();
  const router = useRouter();

  function handleSubmit(values: ProductFormValues) {
    createProduct.mutate(values, {
      onSuccess: (product) => {
        toast.success('Product created');
        router.push(`/admin/products/${product.id}/edit`);
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Could not create product')),
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">New Product</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ProductForm onSubmit={handleSubmit} submitting={createProduct.isPending} submitLabel="Create product" />
      </div>
    </div>
  );
}
