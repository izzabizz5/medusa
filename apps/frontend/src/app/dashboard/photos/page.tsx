'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { photosApi } from '@/lib/api';

const STATUS_CONFIG = {
  pending:    { label: 'Queued',      color: 'rgba(237,229,207,0.35)' },
  processing: { label: 'Processing',  color: '#e89828' },
  embedded:   { label: 'Protected',   color: '#8fc832' },
  failed:     { label: 'Failed',      color: '#d96858' },
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await photosApi.list();
      setPhotos(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const failedCount = photos.filter((p) => p.status === 'failed').length;

  const handleRetry = async () => {
    setRetrying(true);
    setError('');
    try {
      await photosApi.retryFailed();
      await loadPhotos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await photosApi.upload(file);
      await loadPhotos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', marginBottom: '10px' }}>
            Reference images
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
            My Photos.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {failedCount > 0 && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              style={{ background: 'transparent', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 18px', border: '1px solid rgba(217,104,88,0.35)', cursor: retrying ? 'not-allowed' : 'pointer', opacity: retrying ? 0.6 : 1 }}
            >
              {retrying ? 'Retrying...' : `↺ Retry failed (${failedCount})`}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ background: uploading ? 'rgba(143,200,50,0.5)' : '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 22px', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer' }}
          >
            {uploading ? 'Uploading...' : '+ Upload photo'}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {error && (
        <div style={{ background: 'rgba(217,104,88,0.12)', border: '1px solid rgba(217,104,88,0.25)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', padding: '12px 14px', marginBottom: '24px', letterSpacing: '0.04em' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'rgba(143,200,50,0.06)', border: '1px solid rgba(143,200,50,0.15)', padding: '16px 20px', marginBottom: '32px' }}>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.55)', lineHeight: 1.65, margin: 0 }}>
          Upload clear, front-facing photos. Multiple photos improve recognition accuracy. Images are stored securely and used only for matching.
        </p>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', opacity: 0.12, lineHeight: 1, marginBottom: '16px' }}>◇</div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
            No photos uploaded yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
          {photos.map((photo) => {
            const cfg = STATUS_CONFIG[photo.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            return (
              <div key={photo.id} style={{ background: '#0d1614', overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1', background: 'rgba(27,52,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.2)' }}>
                    {photo.originalName || 'photo'}
                  </span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: cfg.color, marginBottom: '4px' }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.25)', letterSpacing: '0.08em' }}>
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
