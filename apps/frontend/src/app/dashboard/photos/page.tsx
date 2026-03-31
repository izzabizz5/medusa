'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { photosApi } from '@/lib/api';
import { Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Queued', icon: Clock, color: 'text-gray-500' },
  processing: { label: 'Processing', icon: Clock, color: 'text-yellow-600' },
  embedded: { label: 'Protected', icon: CheckCircle, color: 'text-green-600' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-red-600' },
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await photosApi.list();
      setPhotos(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Protected Photos</h1>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload photo'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={handleUpload} />
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 text-sm text-primary-700">
        Upload clear, front-facing photos of your face. Multiple photos improve recognition accuracy.
        Photos are stored securely and only used for matching.
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No photos uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => {
            const cfg = STATUS_CONFIG[photo.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            return (
              <div key={photo.id} className="bg-white rounded-xl border overflow-hidden">
                <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  {photo.originalName || 'Photo'}
                </div>
                <div className="p-3">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                    <cfg.icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
