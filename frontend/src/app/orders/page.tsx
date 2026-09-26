'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useOrders } from '@/hooks/useOrders';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';

function OrdersContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOrders(page);

  if (isLoading) return <PageSpinner />;

  const orders = data?.orders ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Your past orders will show up here."
          action={
            <Link
              href="/products"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Shop products
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {formatCurrency(order.totalAmount)}
                </p>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}
