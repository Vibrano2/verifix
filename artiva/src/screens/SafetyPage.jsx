import React from 'react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useApp } from '../context/AppContext';
import { LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';

const safeguards = [
  ['Verified profiles', 'Clients see artisans only after their profile has been reviewed and approved.'],
  ['In-app communication', 'Keep job conversations inside Artiva after payment confirmation.'],
  ['Pay-per-job escrow', 'Payment is held for the specific job and released after completion is approved.'],
];

export function SafetyPage() {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar />
      <main className="flex-1">
        <section className="bg-splash-radial text-white py-14 px-4 sm:px-6 lg:px-8 text-center">
          <ShieldCheck className="w-8 h-8 text-[#16D4C6] mx-auto mb-3" strokeWidth={1.6} />
          <h1 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">Safety & Security</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto mt-2">Designed to make every local-service job clearer and more secure.</p>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
          {safeguards.map(([title, description], index) => (
            <article key={title} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5F6] text-[#16858F] flex items-center justify-center flex-shrink-0">
                {index === 1 ? <MessageCircle className="w-5 h-5" /> : index === 2 ? <LockKeyhole className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="font-bold text-[#0E3B40] font-['Outfit']">{title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{description}</p>
              </div>
            </article>
          ))}
          <button type="button" onClick={() => navigateTo('how_it_works')} className="w-full py-3.5 border border-[#16858F] text-[#16858F] font-bold text-sm rounded-xl btn-press">
            See how Artiva works
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
