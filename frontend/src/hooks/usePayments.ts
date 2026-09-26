import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiSuccess, CreateIntentResponse } from '@/lib/types';

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post<ApiSuccess<CreateIntentResponse>>('/payments/create-intent', {
        orderId,
      });
      return res.data.data;
    },
  });
}
