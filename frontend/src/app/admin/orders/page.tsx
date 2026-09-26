'use client';

import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { useOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { OrderStatus } from '@/lib/types';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | undefined>();
  const { data: order, isLoading, isError } = useOrder(activeOrderId);
  const updateStatus = useUpdateOrderStatus();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!orderIdInput.trim()) return;
    setActiveOrderId(orderIdInput.trim());
  }

  function handleTransition(status: OrderStatus) {
    if (!order) return;
    updateStatus.mutate(
      { id: order.id, status },
      {
        onSuccess: () => toast.success(`Order marked as ${status}`),
        onError: (err) => toast.error(getErrorMessage(err, 'Could not update order status')),
      },
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Orders</h1>
      <p className="mb-4 text-sm text-slate-500">
        Look up an order by its ID to view details and update its status.
      </p>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            placeholder="Order ID"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      {isLoading && <PageSpinner />}

      {isError && (
        <p className="text-sm text-red-600">Order not found. Check the ID and try again.</p>
      )}

      {order && (
        <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Order #{order.id.slice(0, 8)}</p>
              <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <p className="mb-2 text-sm text-slate-600">
            <span className="font-medium text-slate-900">Shipping:</span> {order.shippingAddress}
          </p>

          <div className="my-3 border-t border-slate-100 pt-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1 text-sm text-slate-600">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          {ALLOWED_TRANSITIONS[order.status].length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ALLOWED_TRANSITIONS[order.status].map((status) => (
                <button
                  key={status}
                  onClick={() => handleTransition(status)}
                  disabled={updateStatus.isPending}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Mark as {status}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
