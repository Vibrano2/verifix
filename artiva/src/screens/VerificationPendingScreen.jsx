import React from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { Clock, ShieldAlert, CheckCircle2, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

export function VerificationPendingScreen({ artisanId }) {
  const { navigateTo, currentUser, showToast } = useApp();
  const targetId = artisanId || currentUser?.uid || 'artisan_demo';

  const handleSimulateAdminApproval = async () => {
    try {
      await ApiService.verifyArtisan(targetId);
      showToast('Artisan approved by Admin!', 'success');
      navigateTo('artisan_dash', { artisanId: targetId });
    } catch (err) {
      showToast('Error approving artisan: ' + err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Header title="Verification Status" backTo="onboarding" />

      <main className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card animate-fade-in text-center space-y-6">
          
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-bold font-['Outfit'] text-[#0E3B40]">
              Verification Under Review
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Your NIN details and trade certificates have been submitted to the Artiva Admin Queue for Life Camp.
            </p>
          </div>

          {/* Checklist */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">NIN Identity Database:</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px] uppercase">Reviewing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Trade Skill Credentials:</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px] uppercase">Submitted</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Life Camp Coverage:</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px] uppercase">Approved</span>
            </div>
          </div>

          {/* Interactive Demo Trigger */}
          <div className="pt-2 space-y-3">
            <button
              onClick={handleSimulateAdminApproval}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target"
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>Simulate Admin Approval (Instant Demo)</span>
            </button>

            <button
              onClick={() => navigateTo('admin_queue')}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Go to Admin Verification Queue Console
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
