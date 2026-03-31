'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { matchesApi, photosApi } from '@/lib/api';
import { Shield, Image, AlertTriangle, FileText } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ photos: 0, pendingMatches: 0, confirmedMatches: 0, takedowns: 0 });

  useEffect(() => {
    Promise.all([
      photosApi.list(),
      matchesApi.list('pending_review'),
      matchesApi.list('confirmed'),
    ]).then(([photos, pending, confirmed]) => {
      setStats({
        photos: photos.data.length,
        pendingMatches: pending.data.length,
        confirmedMatches: confirmed.data.length,
        takedowns: 0,
      });
    }).catch(() => {});
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Protected photos', value: stats.photos, icon: Image, color: 'text-blue-600' },
          { label: 'Pending review', value: stats.pendingMatches, icon: AlertTriangle, color: 'text-yellow-600' },
          { label: 'Confirmed matches', value: stats.confirmedMatches, icon: Shield, color: 'text-red-600' },
          { label: 'Takedowns filed', value: stats.takedowns, icon: FileText, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-5">
            <Icon className={`w-6 h-6 ${color} mb-3`} />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-6">
        <h2 className="font-semibold text-primary-800 mb-2">How Medusa works</h2>
        <ol className="space-y-2 text-sm text-primary-700 list-decimal list-inside">
          <li>Upload clear photos of your face (more photos = better accuracy)</li>
          <li>We scan the web daily and find potential matches using facial recognition</li>
          <li>You review each match and confirm it is you before anything happens</li>
          <li>Request a platform takedown or DMCA notice — we file it for you after admin review</li>
        </ol>
      </div>
    </DashboardLayout>
  );
}
