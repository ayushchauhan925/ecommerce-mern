'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, LogOut, ShieldCheck, Package } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useCart } from '@/hooks/useCart';
import { useLogout, useMe } from '@/hooks/useAuth';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { data: cart } = useCart();
  const logout = useLogout();
  useMe();

  const itemCount = cart?.totalItems ?? 0;

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/'),
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          Shopfront
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/products" className="hover:text-slate-900">
            Products
          </Link>
          {accessToken && (
            <Link href="/orders" className="hover:text-slate-900">
              My Orders
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="flex items-center gap-1 hover:text-slate-900">
              <ShieldCheck size={16} /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="relative flex items-center gap-1 rounded-md p-2 text-slate-700 hover:bg-slate-100"
          >
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {accessToken && user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/account"
                className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <User size={16} />
                {user.name.split(' ')[0]}
              </Link>
              <button
                onClick={handleLogout}
                disabled={logout.isPending}
                className="flex items-center gap-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link href="/login" className="text-slate-700 hover:text-slate-900">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      <nav className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 text-sm font-medium text-slate-600 sm:hidden">
        <Link href="/products" className="hover:text-slate-900">
          Products
        </Link>
        {accessToken && (
          <Link href="/orders" className="flex items-center gap-1 hover:text-slate-900">
            <Package size={14} /> Orders
          </Link>
        )}
        {user?.role === 'ADMIN' && (
          <Link href="/admin" className="flex items-center gap-1 hover:text-slate-900">
            <ShieldCheck size={14} /> Admin
          </Link>
        )}
      </nav>
    </header>
  );
}
