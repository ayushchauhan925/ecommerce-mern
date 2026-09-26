'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageSpinner } from '@/components/ui/Spinner';

export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const authorized = !!accessToken && (!adminOnly || user?.role === 'ADMIN');

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    } else if (adminOnly && user && user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [accessToken, adminOnly, user, router]);

  if (!authorized) return <PageSpinner />;

  return <>{children}</>;
}
