import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { Phone, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { navigateTo, setCurrentUser, setUserRole, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('8031234567');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fullPhone = `+234${phone.replace(/^0+/, '')}`;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      setError('Please enter a valid 10-digit Nigerian phone number.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await ApiService.sendOtp(fullPhone);
      setLoading(false);
      setStep(2);
      showToast(`Verification code sent to ${fullPhone}`, 'success');
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await ApiService.verifyOtp(fullPhone, otp, 'client');
      setLoading(false);
      setCurrentUser(res.user);
      setUserRole('client');
      showToast('Logged in successfully!', 'success');
      navigateTo('client_dash');
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="login" />

      <main className="flex-1 flex flex-col justify-center px-4 py-12">
        <div className="max-w-md mx-auto w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-6 animate-fade-in">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5F6] text-[#16858F] flex items-center justify-center mx-auto">
              {step === 1 ? <Phone className="w-6 h-6 stroke-[2.5]" /> : <KeyRound className="w-6 h-6 stroke-[2.5]" />}
            </div>
            <h1 className="text-2xl font-bold font-['Outfit'] text-[#0E3B40]">
              {step === 1 ? 'Log In to Artiva' : 'Enter 6-Digit OTP'}
            </h1>
            <p className="text-xs text-slate-500">
              {step === 1 ? 'Enter your registered phone number' : `Sent to ${fullPhone}`}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <span className="px-3.5 py-3.5 bg-slate-100 text-slate-700 font-bold text-sm border-r border-slate-200">
                    🇳🇬 +234
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="803 123 4567"
                    className="w-full px-3 py-3.5 bg-transparent font-medium text-[#0E3B40] text-sm focus:outline-none"
                    maxLength={10}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue with Phone</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-2xl font-extrabold tracking-[0.3em] text-[#0E3B40] focus:border-[#16858F] focus:outline-none"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="bg-[#E8F5F6] p-3 rounded-xl border border-[#16858F]/20 flex items-center justify-between text-xs">
                <span className="text-[#0E3B40]">Demo Code: <strong>123456</strong></span>
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="px-2.5 py-1 bg-[#16858F] text-white font-bold text-[11px] rounded-lg btn-press"
                >
                  Fill Code
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm btn-press touch-target disabled:opacity-50"
              >
                <span>Verify & Log In</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <button
              onClick={() => navigateTo('signup')}
              className="text-[#16858F] font-bold hover:underline"
            >
              Sign Up
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
