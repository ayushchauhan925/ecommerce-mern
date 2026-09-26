'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useMe, useUpdateProfile } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageSpinner } from '@/components/ui/Spinner';

function AccountContent() {
  const { data: user, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState('');

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (isLoading || !user) return <PageSpinner />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    updateProfile.mutate(
      { name: name.trim() },
      {
        onSuccess: () => toast.success('Profile updated'),
        onError: (err) => toast.error(getErrorMessage(err, 'Could not update profile')),
      },
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            value={user.email}
            disabled
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <input
            value={user.role}
            disabled
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        {user.createdAt && (
          <p className="text-xs text-slate-400">Member since {formatDate(user.createdAt)}</p>
        )}
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}
