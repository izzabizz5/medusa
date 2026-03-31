'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Image, Search, FileText, LogOut, Settings } from 'lucide-react';
import { clearAuth, getUser } from '@/lib/auth';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Shield },
  { href: '/dashboard/photos', label: 'My Photos', icon: Image },
  { href: '/dashboard/matches', label: 'Matches', icon: Search },
  { href: '/dashboard/takedowns', label: 'Takedowns', icon: FileText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="px-6 py-5 border-b">
          <span className="text-lg font-bold text-primary-700">Medusa</span>
          {user && <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100',
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          {user?.role === 'admin' && (
            <Link href="/admin/takedowns"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100',
              )}>
              <Settings className="w-4 h-4" />
              Admin Queue
            </Link>
          )}
        </nav>

        <div className="px-4 py-4 border-t">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full">
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
