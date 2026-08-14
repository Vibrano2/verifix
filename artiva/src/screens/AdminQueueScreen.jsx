import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ShieldCheck, CheckCircle2, AlertTriangle, Eye, UserCheck, RefreshCw } from 'lucide-react';

export function AdminQueueScreen() {
  const { navigateTo, showToast } = useApp();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getAdminQueue();
      setQueue(list);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      showToast('Failed to fetch admin verification queue: ' + err.message, 'error');
    }
  };

  const handleApprove = async (uid) => {
    try {
      await ApiService.verifyArtisan(uid);
      showToast('Artisan verified successfully!', 'success');
      fetchQueue();
    } catch (err) {
      showToast('Error verifying artisan: ' + err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] pb-12">
      <Header title="Admin Verification Queue" backTo="onboarding" />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4 animate-fade-in">
        
        <div className="bg-purple-900 text-white p-5 rounded-3xl shadow-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
              Internal Verification Console
            </span>
            <span className="px-2 py-0.5 bg-purple-700 text-purple-100 text-[10px] font-bold rounded-full">
              {queue.length} Pending
            </span>
          </div>
          <h1 className="text-xl font-bold font-['Outfit']">NIN & Credentials Review</h1>
          <p className="text-xs text-purple-200">
            Review and approve pending artisan profiles before they go live in Life Camp.
          </p>
        </div>

        {loading ? (
          <SkeletonLoader type="card" count={2} />
        ) : queue.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-[#0E3B40]">Queue Clear!</h3>
            <p className="text-xs text-slate-500">All submitted artisan profiles in Life Camp have been verified.</p>
            <button
              onClick={() => navigateTo('client_dash')}
              className="px-4 py-2.5 bg-[#16858F] text-white text-xs font-bold rounded-xl"
            >
              Back to Client Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {queue.map((artisan) => (
              <div key={artisan.uid} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#0E3B40] text-sm">
                      {artisan.first_name} {artisan.last_name}
                    </h3>
                    <p className="text-xs text-[#16858F] font-semibold">{artisan.trade} • {artisan.location}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg uppercase">
                    Pending NIN Review
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Provided NIN:</span>
                    <span className="font-mono font-bold text-[#0E3B40]">1234••••901 (Submitted)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Services:</span>
                    <span className="font-medium text-slate-800">{artisan.services.join(', ')}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleApprove(artisan.uid)}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm btn-press"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Approve & Grant Verified Status</span>
                </button>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
