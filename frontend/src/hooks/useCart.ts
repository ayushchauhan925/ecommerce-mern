import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ApiSuccess, CartResponse } from '@/lib/types';

export function useCart() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['cart'],
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<CartResponse>>('/cart');
      return res.data.data;
    },
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string; quantity: number }) => {
      const res = await api.post<ApiSuccess<CartResponse>>('/cart/items', input);
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const res = await api.patch<ApiSuccess<CartResponse>>(`/cart/items/${productId}`, {
        quantity,
      });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await api.delete<ApiSuccess<CartResponse>>(`/cart/items/${productId}`);
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<ApiSuccess<CartResponse>>('/cart');
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });
}
