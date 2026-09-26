'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth adminOnly>
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </RequireAuth>
  );
}
