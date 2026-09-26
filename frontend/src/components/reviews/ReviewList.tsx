'use client';

import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { useReviews, useDeleteReview } from '@/hooks/useReviews';
import { useAuthStore } from '@/store/auth-store';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';

export function ReviewList({ productId }: { productId: string }) {
  const { data, isLoading } = useReviews(productId);
  const user = useAuthStore((s) => s.user);
  const deleteReview = useDeleteReview(productId);

  if (isLoading) return <PageSpinner />;

  const reviews = data?.reviews ?? [];

  if (reviews.length === 0) {
    return <p className="text-sm text-slate-500">No reviews yet. Be the first to review this product.</p>;
  }

  function handleDelete(id: string) {
    deleteReview.mutate(id, {
      onSuccess: () => toast.success('Review deleted'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not delete review')),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => {
        const canDelete = user && (user.id === review.userId || user.role === 'ADMIN');
        return (
          <div key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{review.userName}</span>
                  <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
                </div>
                <StarRating value={review.rating} readOnly size={14} />
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(review.id)}
                  className="text-slate-400 hover:text-red-600"
                  title="Delete review"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {review.comment && <p className="mt-2 text-sm text-slate-600">{review.comment}</p>}
          </div>
        );
      })}
    </div>
  );
}
