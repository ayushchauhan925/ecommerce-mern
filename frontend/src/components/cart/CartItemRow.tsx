'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CartItemResponse } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useRemoveCartItem, useUpdateCartItem } from '@/hooks/useCart';
import { getErrorMessage } from '@/lib/api';

export function CartItemRow({ item }: { item: CartItemResponse }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  function handleQuantityChange(quantity: number) {
    if (quantity < 1) return;
    updateItem.mutate(
      { productId: item.productId, quantity },
      { onError: (err) => toast.error(getErrorMessage(err, 'Could not update quantity')) },
    );
  }

  function handleRemove() {
    removeItem.mutate(item.productId, {
      onError: (err) => toast.error(getErrorMessage(err, 'Could not remove item')),
    });
  }

  return (
    <div className="flex items-center gap-4 border-b border-slate-200 py-4 last:border-0">
      <Link
        href={`/products/${item.productId}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100"
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageOff size={20} />
          </div>
        )}
      </Link>

      <div className="flex-1">
        <Link
          href={`/products/${item.productId}`}
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          {item.productName}
        </Link>
        <p className="text-sm text-slate-500">{formatCurrency(item.price)} each</p>
      </div>

      <div className="flex items-center rounded-md border border-slate-300">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={updateItem.isPending}
          className="p-2 text-slate-600 hover:bg-slate-100"
        >
          <Minus size={14} />
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={updateItem.isPending}
          className="p-2 text-slate-600 hover:bg-slate-100"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="w-24 text-right text-sm font-semibold text-slate-900">
        {formatCurrency(item.subtotal)}
      </div>

      <button
        onClick={handleRemove}
        disabled={removeItem.isPending}
        className="p-2 text-slate-400 hover:text-red-600"
        title="Remove item"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
