'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useCart, useClearCart } from '@/hooks/useCart';
import { CartItemRow } from '@/components/cart/CartItemRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

function CartContent() {
  const { data: cart, isLoading } = useCart();
  const clearCart = useClearCart();
  const router = useRouter();

  if (isLoading) return <PageSpinner />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Browse our products and add something you like."
          action={
            <Link
              href="/products"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Shop products
            </Link>
          }
        />
      </div>
    );
  }

  function handleClear() {
    clearCart.mutate(undefined, {
      onSuccess: () => toast.success('Cart cleared'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not clear cart')),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
        <button onClick={handleClear} className="text-sm font-medium text-slate-500 hover:text-red-600">
          Clear cart
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {cart.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-end gap-3">
        <div className="text-lg font-bold text-slate-900">
          Total: {formatCurrency(cart.totalAmount)}
        </div>
        <button
          onClick={() => router.push('/checkout')}
          className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}
