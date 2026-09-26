import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiSuccess, OrderResponse, OrderStatus, PaginatedOrders } from '@/lib/types';

export function useOrders(page: number, limit = 10) {
  return useQuery({
    queryKey: ['orders', page, limit],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaginatedOrders>>('/orders', {
        params: { page, limit },
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<OrderResponse>>(`/orders/${id}`);
      return res.data.data;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shippingAddress: string }) => {
      const res = await api.post<ApiSuccess<OrderResponse>>('/orders', input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiSuccess<OrderResponse>>(`/orders/${id}/cancel`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', data.id], data);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const res = await api.patch<ApiSuccess<OrderResponse>>(`/orders/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', data.id], data);
    },
  });
}
