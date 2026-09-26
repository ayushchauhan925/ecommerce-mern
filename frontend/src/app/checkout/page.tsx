'use client';

import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useCart } from '@/hooks/useCart';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCreatePaymentIntent } from '@/hooks/usePayments';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { getStripe } from '@/lib/stripe';
import { getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';

function CheckoutContent() {
  const { data: cart, isLoading } = useCart();
  const createOrder = useCreateOrder();
  const createIntent = useCreatePaymentIntent();

  const [shippingAddress, setShippingAddress] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <PageSpinner />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add some products before checking out."
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

  async function handleCreateOrder() {
    setError(null);
    if (shippingAddress.trim().length < 10) {
      setError('Please enter a complete shipping address (at least 10 characters).');
      return;
    }

    try {
      const order = await createOrder.mutateAsync({ shippingAddress: shippingAddress.trim() });
      const intent = await createIntent.mutateAsync(order.id);
      setOrderId(order.id);
      setClientSecret(intent.clientSecret);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start checkout'));
    }
  }

  const isCreating = createOrder.isPending || createIntent.isPending;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Order summary</h2>
        {cart.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm text-slate-600">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(cart.totalAmount)}</span>
        </div>
      </div>

      {!clientSecret ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Shipping address
          </label>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={3}
            placeholder="Street, city, state, zip, country"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <button
            onClick={handleCreateOrder}
            disabled={isCreating}
            className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isCreating ? 'Preparing payment...' : 'Continue to payment'}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Payment details</h2>
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <PaymentForm orderId={orderId!} />
          </Elements>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}
