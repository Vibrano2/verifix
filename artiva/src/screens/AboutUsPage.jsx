import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { ShieldCheck, UserCheck, Award, Heart, CheckCircle2 } from 'lucide-react';

export function AboutUsPage() {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="about" />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-splash-radial text-white py-16 px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#16D4C6]">
              <ShieldCheck className="w-4 h-4 text-[#FAB804]" />
              <span>Built on 25 Years of Real Contracting Experience</span>
            </div>
            <h1 className="text-2xl sm:text-5xl font-extrabold font-['Outfit'] tracking-tight">
              Creating a Safer, More Reliable Way to Hire Local Artisans.
            </h1>
            <p className="text-xs sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Starting in Abuja and expanding across Nigeria, Artiva bridges the trust gap between homeowners and verified skilled craftspeople.
            </p>
          </div>
        </section>

        {/* FOUNDER STORY SECTION */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E8F5F6] text-[#16858F] flex items-center justify-center font-extrabold text-2xl font-['Outfit'] border border-[#16858F]/20 flex-shrink-0">
                G
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-[#0E3B40]">
                  Founded by Gabriel
                </h2>
                <p className="text-xs text-[#16858F] font-semibold">25+ Years Construction & Contracting Experience in Abuja</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
              <p>
                After spending over two decades managing residential and commercial contracting projects in Abuja, Gabriel experienced firsthand the recurring frustrations that plagued local service hiring: clients struggling to find verified craftspeople they could trust in their homes, and skilled artisans struggling with delayed payments and lack of formal recognition.
              </p>
              <p>
                Artiva was created to fix this broken dynamic. By combining mandatory National Identification Number (NIN) background verification with a pay-per-job escrow payment model, Artiva guarantees that clients only pay for completed work while honest artisans receive prompt, guaranteed payouts.
              </p>
            </div>
          </div>

          {/* CORE VALUES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="font-bold text-[#0E3B40] text-sm font-['Outfit']">Identity Trust</h3>
              <p className="text-xs text-slate-500">NIN identity verification on every artisan profile.</p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Award className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="font-bold text-[#0E3B40] text-sm font-['Outfit']">Fair Escrow</h3>
              <p className="text-xs text-slate-500">Funds reserved per job order and released on completion.</p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F5F6] text-[#16858F] flex items-center justify-center mx-auto mb-2">
                <Heart className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="font-bold text-[#0E3B40] text-sm font-['Outfit']">Abuja Roots</h3>
              <p className="text-xs text-slate-500">Built by Abuja contractors who understand local estate needs.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
