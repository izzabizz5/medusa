'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { takedownsApi } from '@/lib/api';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending_admin_review: { label: 'Pending review', color: 'text-yellow-700 bg-yellow-50', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-700 bg-blue-50', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700 bg-red-50', icon: XCircle },
  filed: { label: 'Filed', color: 'text-purple-700 bg-purple-50', icon: FileText },
  completed: { label: 'Completed', color: 'text-green-700 bg-green-50', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-700 bg-red-50', icon: AlertCircle },
};

export default function TakedownsPage() {
  const [takedowns, setTakedowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    takedownsApi.listMine().then((res) => setTakedowns(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Takedown Requests</h1>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : takedowns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No takedown requests yet</p>
          <p className="text-xs mt-1">Confirm a match and request a takedown to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {takedowns.map((td) => {
            const cfg = STATUS_CONFIG[td.status] || STATUS_CONFIG.pending_admin_review;
            return (
              <div key={td.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                      <cfg.icon className="inline w-3 h-3 mr-1" />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{td.type} takedown</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(td.createdAt).toLocaleDateString()}</span>
                </div>

                {td.match?.foundImage?.pageUrl && (
                  <p className="text-xs text-gray-600 truncate mb-2">
                    URL: {td.match.foundImage.pageUrl}
                  </p>
                )}

                {td.adminNotes && (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mt-2">
                    <span className="font-medium">Admin note:</span> {td.adminNotes}
                  </div>
                )}

                {/* Event timeline */}
                {td.events?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Timeline</p>
                    <div className="space-y-1">
                      {td.events.map((ev: any) => (
                        <div key={ev.id} className="flex gap-2 text-xs text-gray-500">
                          <span className="text-gray-300">{new Date(ev.createdAt).toLocaleDateString()}</span>
                          <span className="capitalize">{ev.eventType.replace(/_/g, ' ')}</span>
                          {ev.notes && <span className="text-gray-400">— {ev.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
