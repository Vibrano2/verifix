import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { OfflineBanner } from '../components/OfflineBanner';
import { Phone, ShieldCheck, ArrowRight, CheckSquare, Square, RefreshCw, KeyRound } from 'lucide-react';

export function AuthScreen({ role = 'client' }) {
  const { navigateTo, setCurrentUser, setUserRole, showToast } = useApp();

  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [phone, setPhone] = useState('8031234567');
  const [otp, setOtp] = useState('');
  const [ndprConsent, setNdprConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(30);

  const fullPhoneNumber = `+234${phone.replace(/^0+/, '')}`;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      setError('Please enter a valid 10-digit Nigerian phone number.');
      return;
    }
    if (!ndprConsent) {
      setError('You must accept the NDPR privacy policy to proceed.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await ApiService.sendOtp(fullPhoneNumber);
      setLoading(false);
      setStep(2);
      showToast(`OTP sent to ${fullPhoneNumber}`, 'success');
      startTimer();
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const startTimer = () => {
    setTimer(30);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await ApiService.verifyOtp(fullPhoneNumber, otp, role);
      setLoading(false);
      setCurrentUser(res.user);
      setUserRole(role);
      showToast('Authentication successful!', 'success');

      if (role === 'artisan') {
        navigateTo('artisan_signup');
      } else {
        navigateTo('client_dash');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleQuickFillDemo = () => {
    setOtp('123456');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Header backTo="onboarding" />
      <OfflineBanner onRetry={step === 1 ? handleSendOtp : handleVerifyOtp} />

      <main className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card animate-fade-in">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5F6] text-[#16858F] flex items-center justify-center mx-auto mb-3">
              {step === 1 ? <Phone className="w-6 h-6 stroke-[2.5]" /> : <KeyRound className="w-6 h-6 stroke-[2.5]" />}
            </div>
            <h1 className="text-2xl font-bold font-['Outfit'] text-[#0E3B40]">
              {step === 1 ? 'Enter Phone Number' : 'Verify Security Code'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {step === 1 
                ? 'Instant verification for Life Camp clients & artisans.' 
                : `We sent a 6-digit OTP code to ${fullPhoneNumber}`}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-pulse">
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: PHONE FORM */
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-2">
                  Nigerian Phone Number
                </label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/50 focus-within:border-[#16858F] focus-within:ring-2 focus-within:ring-[#16858F]/20 overflow-hidden transition-all">
                  <span className="px-3.5 py-3.5 bg-slate-100 text-slate-700 font-bold text-sm border-r border-slate-200 flex items-center gap-1.5">
                    <span className="text-base">🇳🇬</span> +234
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="803 123 4567"
                    className="w-full px-3 py-3.5 bg-transparent font-medium text-slate-900 text-base focus:outline-none"
                    maxLength={10}
                    autoFocus
                  />
                </div>
              </div>

              {/* NDPR Consent Checkbox */}
              <div 
                onClick={() => setNdprConsent(!ndprConsent)}
                className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {ndprConsent ? (
                  <CheckSquare className="w-5 h-5 text-[#16858F] flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-xs text-slate-600 leading-snug">
                  I agree to Artiva's Terms and consent to data processing under Nigeria Data Protection Regulation (NDPR).
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: OTP VERIFICATION FORM */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-2xl font-extrabold tracking-[0.4em] text-[#0E3B40] focus:border-[#16858F] focus:ring-2 focus:ring-[#16858F]/20 focus:outline-none"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {/* Demo Quick Fill Helper */}
              <div className="bg-[#E8F5F6] p-3 rounded-2xl border border-[#16858F]/20 flex items-center justify-between gap-2">
                <span className="text-xs text-[#0E3B40] font-medium">Demo Testing Code: <strong>123456</strong></span>
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="px-2.5 py-1 bg-[#16858F] text-white text-xs font-bold rounded-lg hover:bg-[#0E5C63] transition-all btn-press"
                >
                  Quick Fill
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="hover:text-[#16858F] underline"
                >
                  Change Phone Number
                </button>
                {timer > 0 ? (
                  <span>Resend code in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[#16858F] font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend OTP
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ShieldCheck className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Security Badge */}
      <footer className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-[#16858F]" />
        <span>End-to-End Escrow Protection • Life Camp Abuja</span>
      </footer>
    </div>
  );
}
