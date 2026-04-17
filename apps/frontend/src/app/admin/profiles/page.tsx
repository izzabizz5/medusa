'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminApi } from '@/lib/api';
import { setAuth, getAdminUser } from '@/lib/auth';

interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function AdminProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers();
      setProfiles(res.data);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSwitch(profile: Profile) {
    setSwitchingId(profile.id);
    try {
      const res = await adminApi.impersonate(profile.id);
      // Sync localStorage with new session state
      setAuth(res.data.user, res.data.adminUser);
      router.push('/dashboard');
    } catch {
      setSwitchingId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await adminApi.createProfile({ name: form.name, email: form.email || undefined });
      setForm({ name: '', email: '' });
      setShowAdd(false);
      await load();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create profile');
    } finally {
      setFormLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(13,22,20,0.7)',
    border: '1px solid rgba(237,229,207,0.1)',
    color: '#ede5cf',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    padding: '10px 13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(237,229,207,0.35)',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d96858', marginBottom: '10px', opacity: 0.8 }}>
          Admin
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
              Profiles.
            </h1>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', marginTop: '10px' }}>
              Manage athlete accounts and switch into them to act on their behalf.
            </p>
          </div>
          <button
            onClick={() => { setShowAdd((v) => !v); setFormError(''); }}
            style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '10px 18px', border: 'none', cursor: 'pointer' }}
          >
            + new profile
          </button>
        </div>
      </div>

      {/* Create profile form */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: 'rgba(27,52,34,0.35)', border: '1px solid rgba(237,229,207,0.08)', padding: '28px', margin: '32px 0 0' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.4)', marginBottom: '20px' }}>
            New managed profile
          </p>
          {formError && (
            <div style={{ background: 'rgba(217,104,88,0.1)', border: '1px solid rgba(217,104,88,0.2)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 12px', marginBottom: '20px', letterSpacing: '0.04em' }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(143,200,50,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(237,229,207,0.1)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Email — optional</label>
              <input
                type="email"
                placeholder="Leave blank to auto-generate"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(143,200,50,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(237,229,207,0.1)')}
              />
            </div>
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(237,229,207,0.2)', marginBottom: '20px' }}>
            Access via switch-in — no password required.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={formLoading}
              style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '11px 20px', border: 'none', cursor: formLoading ? 'not-allowed' : 'pointer', opacity: formLoading ? 0.6 : 1 }}
            >
              {formLoading ? 'Creating...' : 'Create profile →'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setFormError(''); }}
              style={{ background: 'transparent', color: 'rgba(237,229,207,0.4)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '11px 16px', border: '1px solid rgba(237,229,207,0.1)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Profile list */}
      <div style={{ marginTop: '40px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.25)', marginBottom: '16px' }}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(237,229,207,0.25)' }}>
            Loading...
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', opacity: 0.1, lineHeight: 1, marginBottom: '16px' }}>◇</div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
              No profiles yet
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
            {profiles.map((profile) => {
              const isAdmin = profile.role === 'admin';
              const busy = switchingId === profile.id;
              const currentAdminUser = getAdminUser();
              const isCurrentAdmin = currentAdminUser === null && isAdmin;

              return (
                <div
                  key={profile.id}
                  style={{
                    background: '#0d1614',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    opacity: busy ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                    {/* Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isAdmin ? 'rgba(217,104,88,0.15)' : 'rgba(143,200,50,0.1)',
                      border: `1px solid ${isAdmin ? 'rgba(217,104,88,0.3)' : 'rgba(143,200,50,0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '16px',
                      fontWeight: 700,
                      color: isAdmin ? '#d96858' : '#8fc832',
                    }}>
                      {(profile.fullName || profile.email)[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: '#ede5cf' }}>
                          {profile.fullName || '—'}
                        </span>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '8px',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: isAdmin ? '#d96858' : 'rgba(237,229,207,0.3)',
                          background: isAdmin ? 'rgba(217,104,88,0.1)' : 'rgba(237,229,207,0.05)',
                          padding: '2px 7px',
                          border: `1px solid ${isAdmin ? 'rgba(217,104,88,0.25)' : 'rgba(237,229,207,0.1)'}`,
                        }}>
                          {profile.role}
                        </span>
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'rgba(237,229,207,0.3)', letterSpacing: '0.06em' }}>
                        {profile.email}
                      </span>
                    </div>
                  </div>

                  {/* Switch button — don't show for own admin account */}
                  {!isCurrentAdmin && (
                    <button
                      onClick={() => handleSwitch(profile)}
                      disabled={busy}
                      style={{
                        background: busy ? 'rgba(143,200,50,0.15)' : 'transparent',
                        color: '#8fc832',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '9px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        padding: '9px 16px',
                        border: '1px solid rgba(143,200,50,0.25)',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {busy ? 'Switching...' : '⇄ switch in'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
