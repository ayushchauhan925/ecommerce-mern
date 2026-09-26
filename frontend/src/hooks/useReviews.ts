import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiSuccess, PaginatedReviews, ReviewResponse } from '@/lib/types';

export function useReviews(productId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['reviews', productId, page, limit],
    enabled: !!productId,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaginatedReviews>>(
        `/products/${productId}/reviews`,
        { params: { page, limit } },
      );
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rating: number; comment?: string }) => {
      const res = await api.post<ApiSuccess<ReviewResponse>>(
        `/products/${productId}/reviews`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
}

export function useUpdateReview(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      rating?: number;
      comment?: string;
    }) => {
      const res = await api.patch<ApiSuccess<ReviewResponse>>(`/reviews/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
}

export function useDeleteReview(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
}
