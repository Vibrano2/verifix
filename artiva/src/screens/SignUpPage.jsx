import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { UserCheck, Wrench, ArrowRight, ShieldCheck } from 'lucide-react';

export function SignUpPage() {
  const { navigateTo, setUserRole } = useApp();
  const [selectedRole, setSelectedRole] = useState(null); // 'client' | 'artisan'

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setUserRole(role);

    if (role === 'client') {
      navigateTo('auth', { role: 'client' });
    } else {
      navigateTo('artisan_signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="signup" />

      <main className="flex-1 flex flex-col justify-center px-4 py-12">
        <div className="max-w-md mx-auto w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-6 animate-fade-in text-center">
          
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5F6] text-[#16858F] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold font-['Outfit'] text-[#0E3B40]">
              How will you use Artiva?
            </h1>
            <p className="text-xs text-slate-500">
              Select your account type to continue with phone verification.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {/* CHOICE 1: CLIENT */}
            <div
              onClick={() => handleSelectRole('client')}
              className="p-5 rounded-2xl border border-slate-200 hover:border-[#16858F] bg-slate-50 hover:bg-[#E8F5F6]/40 cursor-pointer transition-all text-left flex items-start gap-4 btn-press shadow-sm"
            >
              <div className="p-3 bg-white text-[#16858F] rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                <UserCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-[#0E3B40] font-['Outfit']">I Need a Service</h3>
                <p className="text-xs text-slate-500 mt-0.5">Find and hire NIN-verified local artisans with pay-per-job escrow.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#16858F] self-center" />
            </div>

            {/* CHOICE 2: ARTISAN */}
            <div
              onClick={() => handleSelectRole('artisan')}
              className="p-5 rounded-2xl border border-slate-200 hover:border-[#16858F] bg-slate-50 hover:bg-[#E8F5F6]/40 cursor-pointer transition-all text-left flex items-start gap-4 btn-press shadow-sm"
            >
              <div className="p-3 bg-white text-[#FAB804] rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                <Wrench className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-[#0E3B40] font-['Outfit']">I'm an Artisan</h3>
                <p className="text-xs text-slate-500 mt-0.5">Join as a verified professional, receive job requests, and earn 90% payout.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#16858F] self-center" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            Already have an account?{' '}
            <button
              onClick={() => navigateTo('login')}
              className="text-[#16858F] font-bold hover:underline"
            >
              Log In
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
