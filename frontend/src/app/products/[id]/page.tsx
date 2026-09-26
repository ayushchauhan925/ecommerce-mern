'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import { ImageOff, Minus, Plus, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useProduct } from '@/hooks/useProducts';
import { useAddCartItem } from '@/hooks/useCart';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const accessToken = useAuthStore((s) => s.accessToken);
  const addCartItem = useAddCartItem();
  const router = useRouter();

  if (isLoading) return <PageSpinner />;

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <EmptyState title="Product not found" description="This product may have been removed." />
      </div>
    );
  }

  const image = product.images[activeImage];

  function handleAddToCart() {
    if (!accessToken) {
      toast.error('Please log in to add items to your cart');
      router.push('/login');
      return;
    }
    addCartItem.mutate(
      { productId: product!.id, quantity },
      {
        onSuccess: () => toast.success('Added to cart'),
        onError: (err) => toast.error(getErrorMessage(err, 'Could not add to cart')),
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
            {image ? (
              <Image src={image.url} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <ImageOff size={48} />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(idx)}
                  className={`relative h-16 w-16 overflow-hidden rounded-md border-2 ${
                    idx === activeImage ? 'border-slate-900' : 'border-transparent'
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {product.category.name}
            </span>
          )}
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(product.price)}</p>
          {product.description && (
            <p className="whitespace-pre-line text-sm text-slate-600">{product.description}</p>
          )}

          <p className="text-sm text-slate-500">
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border border-slate-300">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 text-slate-600 hover:bg-slate-100"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="p-2 text-slate-600 hover:bg-slate-100"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || addCartItem.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart size={16} />
              {addCartItem.isPending ? 'Adding...' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Reviews</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ReviewList productId={product.id} />
          {accessToken ? (
            <ReviewForm productId={product.id} />
          ) : (
            <p className="text-sm text-slate-500">Log in to write a review.</p>
          )}
        </div>
      </section>
    </div>
  );
}
