import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiSuccess, CategoryResponse } from '@/lib/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<CategoryResponse[]>>('/categories');
      return res.data.data;
    },
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: ['category', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<CategoryResponse>>(`/categories/${id}`);
      return res.data.data;
    },
  });
}

export interface CategoryInput {
  name: string;
  description?: string;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const res = await api.post<ApiSuccess<CategoryResponse>>('/categories', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) => {
      const res = await api.patch<ApiSuccess<CategoryResponse>>(`/categories/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}
