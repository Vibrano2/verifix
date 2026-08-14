import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { OfflineBanner } from '../components/OfflineBanner';
import { Lock, ShieldCheck, CreditCard, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

export function PaystackCheckoutModal({ job, artisan }) {
  const { navigateTo, activeJob, activeArtisan, showToast } = useApp();
  const targetJob = job || activeJob;
  const targetArtisan = artisan || activeArtisan;

  const [paymentState, setPaymentState] = useState('summary'); // 'summary' | 'processing' | 'failed' | 'success'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const matchFee = targetArtisan?.match_fee || 1500;

  const handleInitializePaystack = async () => {
    setPaymentState('processing');
    setLoading(true);
    setErrorMsg(null);

    try {
      // Step 1: Initialize payment per contract
      const payRes = await ApiService.initializePayment(targetJob.job_id, targetArtisan.uid);

      // Simulate Paystack processing delay (1.5 seconds)
      setTimeout(async () => {
        try {
          // Step 2: Unlock chat per contract right after payment confirms held
          await ApiService.unlockChat(targetJob.job_id);

          setLoading(false);
          setPaymentState('success');
          showToast('Match fee held in escrow successfully!', 'success');
        } catch (err) {
          setLoading(false);
          setPaymentState('failed');
          setErrorMsg(err.message);
        }
      }, 1500);

    } catch (err) {
      setLoading(false);
      setPaymentState('failed');
      setErrorMsg(err.message);
    }
  };

  const handleSimulatePaymentFailure = () => {
    setPaymentState('processing');
    setTimeout(() => {
      setPaymentState('failed');
      setErrorMsg('Transaction declined by issuer Bank (Intermittent network timeout). Please retry.');
    }, 1000);
  };

  const handleOpenChatScreen = () => {
    const matchId = `match_${targetJob.job_id}_${targetArtisan.uid}`;
    navigateTo('chat', { job: targetJob, artisan: targetArtisan, matchId });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Header title="Escrow Payment Checkout" backTo="match_list" />
      <OfflineBanner onRetry={handleInitializePaystack} />

      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 flex flex-col justify-center">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card animate-fade-in space-y-5">
          
          {/* Top Paystack & Artiva Security Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#16858F]" />
              <span className="text-xs font-bold text-[#0E3B40] uppercase tracking-wider">
                Paystack Escrow Protection
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Encrypted 256-Bit
            </span>
          </div>

          {/* 1. Summary View */}
          {paymentState === 'summary' && (
            <div className="space-y-5">
              <div className="bg-[#F4F8F8] p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={targetArtisan?.work_photos[0] || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=150&q=80'}
                    alt="Artisan"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-bold text-[#0E3B40] text-sm">
                      {targetArtisan?.first_name} {targetArtisan?.last_name}
                    </h3>
                    <p className="text-xs text-[#16858F] font-semibold">{targetArtisan?.trade} • Life Camp</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Match Fee (Held in Escrow):</span>
                  <span className="font-extrabold text-base text-[#0E3B40]">
                    ₦{matchFee.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 leading-snug">
                <strong>How Escrow Works:</strong> Funds are locked safely. The artisan is NOT paid until you confirm job completion in the app.
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleInitializePaystack}
                  className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target"
                >
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Pay ₦{matchFee.toLocaleString()} & Unlock Chat</span>
                </button>

                <button
                  onClick={handleSimulatePaymentFailure}
                  className="w-full py-2 text-xs text-slate-400 font-medium hover:text-red-600 transition-colors"
                >
                  (Test Failed Payment Screen Flow)
                </button>
              </div>
            </div>
          )}

          {/* 2. Processing Loading View */}
          {paymentState === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 border-4 border-[#16858F] border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="font-bold text-base text-[#0E3B40] font-['Outfit']">
                Contacting Paystack Gateway...
              </h3>
              <p className="text-xs text-slate-500">Processing escrow reservation over secure network.</p>
            </div>
          )}

          {/* 3. FAILED PAYMENT RETRY SCREEN (Explicit Inclusion #6) */}
          {paymentState === 'failed' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 font-['Outfit']">
                  Payment Could Not Be Processed
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  {errorMsg || 'Your payment attempt timed out or was rejected by your bank network.'}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleInitializePaystack}
                  className="w-full py-3.5 bg-[#16858F] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm btn-press touch-target"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Payment (₦{matchFee.toLocaleString()})</span>
                </button>

                <button
                  onClick={() => setPaymentState('summary')}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Back to Order Summary
                </button>
              </div>
            </div>
          )}

          {/* 4. SUCCESS VIEW */}
          {paymentState === 'success' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0E3B40] font-['Outfit']">
                  Match Fee Confirmed & Held!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chat thread unlocked with {targetArtisan?.first_name} {targetArtisan?.last_name}.
                </p>
              </div>

              <button
                onClick={handleOpenChatScreen}
                className="w-full py-4 bg-[#FAB804] hover:bg-[#FDC80B] text-[#0E3B40] font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-gold-glow transition-all btn-press touch-target"
              >
                <span>Open In-App Chat Now</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
