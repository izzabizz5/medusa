'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(form);
      setAuth(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1614', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '65vw', height: '65vw', top: '-20%', right: '-15%', background: 'radial-gradient(ellipse, #1b3422 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', width: '50vw', height: '50vw', bottom: '-10%', left: '-10%', background: 'radial-gradient(ellipse, #3d6b38 0%, transparent 65%)', filter: 'blur(55px)', opacity: 0.7 }} />
        <div style={{ position: 'absolute', width: '30vw', height: '30vw', top: '30%', left: '20%', background: 'radial-gradient(ellipse, #7b6898 0%, transparent 65%)', filter: 'blur(65px)', opacity: 0.22 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)', backgroundSize: '4px 4px', opacity: 0.1 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.01em' }}>
              med<span style={{ color: '#8fc832', fontStyle: 'italic' }}>usa</span>
            </span>
          </Link>
        </div>

        <div style={{ background: 'rgba(27,52,34,0.45)', border: '1px solid rgba(237,229,207,0.08)', backdropFilter: 'blur(20px)', padding: '40px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', marginBottom: '6px', lineHeight: 1 }}>
            Welcome back.
          </h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', marginBottom: '32px' }}>
            Log in to your account
          </p>

          {error && (
            <div style={{ background: 'rgba(217,104,88,0.12)', border: '1px solid rgba(217,104,88,0.25)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', padding: '12px 14px', marginBottom: '24px', letterSpacing: '0.04em' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.4)', display: 'block', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', background: 'rgba(13,22,20,0.7)', border: '1px solid rgba(237,229,207,0.1)', color: '#ede5cf', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', padding: '11px 13px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(143,200,50,0.45)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(237,229,207,0.1)')}
              />
            </div>
            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.4)', display: 'block', marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', background: 'rgba(13,22,20,0.7)', border: '1px solid rgba(237,229,207,0.1)', color: '#ede5cf', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', padding: '11px 13px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(143,200,50,0.45)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(237,229,207,0.1)')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: loading ? 'rgba(143,200,50,0.55)' : '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500, padding: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Logging in...' : 'Log in →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(237,229,207,0.25)', marginTop: '24px' }}>
          No account?{' '}
          <Link href="/auth/register" style={{ color: '#8fc832', textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
