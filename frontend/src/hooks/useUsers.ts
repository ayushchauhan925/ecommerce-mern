import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiSuccess, PaginatedUsers, Role, SafeUser } from '@/lib/types';

export function useUsersList(page: number, limit = 20) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaginatedUsers>>('/users', {
        params: { page, limit },
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const res = await api.patch<ApiSuccess<SafeUser>>(`/users/${id}/role`, { role });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
