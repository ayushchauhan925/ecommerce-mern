'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUpdateUserRole, useUsersList } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/auth-store';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { Role } from '@/lib/types';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUsersList(page);
  const updateRole = useUpdateUserRole();
  const currentUser = useAuthStore((s) => s.user);

  function handleRoleChange(id: string, role: Role) {
    updateRole.mutate(
      { id, role },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: (err) => toast.error(getErrorMessage(err, 'Could not update role')),
      },
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Users</h1>

      {isLoading ? (
        <PageSpinner />
      ) : !data || data.users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.createdAt ? formatDate(user.createdAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={user.id === currentUser?.id || updateRole.isPending}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
