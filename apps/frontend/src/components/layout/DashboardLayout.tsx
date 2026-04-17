'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getUser, getAdminUser, setAuth, AuthUser } from '@/lib/auth';
import { adminApi } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Overview', index: '01' },
  { href: '/dashboard/photos', label: 'My Photos', index: '02' },
  { href: '/dashboard/matches', label: 'Matches', index: '03' },
  { href: '/dashboard/takedowns', label: 'Takedowns', index: '04' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [exitLoading, setExitLoading] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setAdminUser(getAdminUser());
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const handleExitImpersonation = async () => {
    setExitLoading(true);
    try {
      const res = await adminApi.exitImpersonation();
      setAuth(res.data.user);
      setUser(res.data.user);
      setAdminUser(null);
      router.push('/admin/profiles');
    } catch {
      setExitLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0d1614', color: '#ede5cf' }}>
      {/* Impersonation banner */}
      {adminUser && (
        <div style={{ background: 'rgba(232,152,40,0.12)', borderBottom: '1px solid rgba(232,152,40,0.25)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e89828' }}>
              Viewing as
            </span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600, color: '#ede5cf' }}>
              {user?.fullName || user?.email}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(232,152,40,0.6)', letterSpacing: '0.06em' }}>
              ({user?.email})
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            disabled={exitLoading}
            style={{ background: 'transparent', color: '#e89828', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 14px', border: '1px solid rgba(232,152,40,0.35)', cursor: exitLoading ? 'not-allowed' : 'pointer', opacity: exitLoading ? 0.5 : 1 }}
          >
            {exitLoading ? 'Exiting...' : '↩ exit to admin'}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Sidebar */}
      <aside style={{ width: '210px', flexShrink: 0, borderRight: '1px solid rgba(237,229,207,0.07)', display: 'flex', flexDirection: 'column', background: 'rgba(10,19,16,0.95)' }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(237,229,207,0.07)' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.01em' }}>
              med<span style={{ color: '#8fc832', fontStyle: 'italic' }}>usa</span>
            </span>
          </Link>
          {user && (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', color: adminUser ? 'rgba(232,152,40,0.6)' : 'rgba(237,229,207,0.28)', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(({ href, label, index }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  marginBottom: '1px',
                  textDecoration: 'none',
                  background: active ? 'rgba(143,200,50,0.08)' : 'transparent',
                  borderLeft: `2px solid ${active ? '#8fc832' : 'transparent'}`,
                }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: active ? '#8fc832' : 'rgba(237,229,207,0.22)', letterSpacing: '0.08em', minWidth: '18px' }}>
                  {index}
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 500, color: active ? '#ede5cf' : 'rgba(237,229,207,0.42)' }}>
                  {label}
                </span>
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <>
              <div style={{ height: '1px', background: 'rgba(237,229,207,0.07)', margin: '12px 0' }} />
              {[
                { href: '/admin/profiles', label: 'Profiles' },
                { href: '/admin/pipeline', label: 'Pipeline' },
                { href: '/admin/takedowns', label: 'Takedown Queue' },
                { href: '/admin/urls', label: 'URL Ranking' },
              ].map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '9px 12px',
                      marginBottom: '1px',
                      textDecoration: 'none',
                      background: active ? 'rgba(217,104,88,0.08)' : 'transparent',
                      borderLeft: `2px solid ${active ? '#d96858' : 'transparent'}`,
                    }}
                  >
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#d96858', letterSpacing: '0.08em', minWidth: '18px', opacity: 0.8 }}>A</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 500, color: active ? '#ede5cf' : 'rgba(237,229,207,0.42)' }}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(237,229,207,0.07)' }}>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'rgba(237,229,207,0.22)', minWidth: '18px' }}>↩</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: 'rgba(237,229,207,0.35)' }}>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '52px 48px' }}>
          {children}
        </div>
      </main>
      </div>
    </div>
  );
}
