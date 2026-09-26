'use client';

import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { StarRating } from '@/components/ui/StarRating';
import { useCreateReview } from '@/hooks/useReviews';
import { getErrorMessage } from '@/lib/api';

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const createReview = useCreateReview(productId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    createReview.mutate(
      { rating, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Review submitted');
          setRating(0);
          setComment('');
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Could not submit review')),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Write a review</h3>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts about this product (optional)"
        rows={3}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={createReview.isPending}
        className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {createReview.isPending ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  );
}
