'use client';

import { use } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useCancelOrder, useOrder } from '@/hooks/useOrders';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

function OrderDetailContent({ id }: { id: string }) {
  const { data: order, isLoading } = useOrder(id);
  const cancelOrder = useCancelOrder();

  if (isLoading) return <PageSpinner />;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Order not found" />
      </div>
    );
  }

  function handleCancel() {
    cancelOrder.mutate(order!.id, {
      onSuccess: () => toast.success('Order cancelled'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not cancel order')),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Shipping address</h2>
        <p className="text-sm text-slate-600">{order.shippingAddress}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
            <span className="text-slate-700">
              {item.productName} × {item.quantity}
            </span>
            <span className="font-medium text-slate-900">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between pt-2 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      {order.status === 'PENDING' && (
        <button
          onClick={handleCancel}
          disabled={cancelOrder.isPending}
          className="mt-6 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {cancelOrder.isPending ? 'Cancelling...' : 'Cancel order'}
        </button>
      )}
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <OrderDetailContent id={id} />
    </RequireAuth>
  );
}
