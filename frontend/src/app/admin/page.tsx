import Link from 'next/link';
import { Package, Tags, ClipboardList, Users } from 'lucide-react';

const CARDS = [
  { href: '/admin/products', label: 'Products', description: 'Create, edit, and manage inventory', icon: Package },
  { href: '/admin/categories', label: 'Categories', description: 'Organize your product catalog', icon: Tags },
  { href: '/admin/orders', label: 'Orders', description: 'Look up an order and update its status', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', description: 'Manage customer and admin accounts', icon: Users },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm"
          >
            <Icon size={22} className="mt-0.5 text-slate-700" />
            <div>
              <p className="font-semibold text-slate-900">{label}</p>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
