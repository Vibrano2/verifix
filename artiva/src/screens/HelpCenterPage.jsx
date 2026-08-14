import React from 'react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useApp } from '../context/AppContext';
import { ArrowRight, CircleHelp, MessageCircle, ShieldCheck } from 'lucide-react';

const helpTopics = [
  { title: 'Finding an artisan', description: 'Browse verified profiles, compare services, and start a job request.' },
  { title: 'Escrow payments', description: 'Learn when payments are held and how they are released after completion.' },
  { title: 'Artisan verification', description: 'Understand the identity and profile checks required to join Artiva.' },
];

export function HelpCenterPage() {
  const { navigateTo, showToast } = useApp();

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar />
      <main className="flex-1">
        <section className="bg-splash-radial text-white py-14 px-4 sm:px-6 lg:px-8 text-center">
          <CircleHelp className="w-8 h-8 text-[#16D4C6] mx-auto mb-3" strokeWidth={1.6} />
          <h1 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">Help Center</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto mt-2">Helpful answers for clients and artisans using Artiva.</p>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
          {helpTopics.map((topic) => (
            <button
              key={topic.title}
              type="button"
              onClick={() => showToast('Detailed help articles are coming soon.', 'info')}
              className="w-full bg-white p-5 rounded-2xl border border-slate-200 text-left shadow-sm hover:border-[#16858F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#16858F] transition-colors flex items-center justify-between gap-4"
            >
              <span>
                <span className="block font-bold text-[#0E3B40] font-['Outfit']">{topic.title}</span>
                <span className="block text-xs text-slate-600 mt-1">{topic.description}</span>
              </span>
              <ArrowRight className="w-5 h-5 text-[#16858F] flex-shrink-0" />
            </button>
          ))}

          <div className="bg-[#E8F5F6] border border-[#16858F]/20 rounded-2xl p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#16858F] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#0E3B40]">For account access, sign in with your phone number and use the verification code sent to you.</p>
          </div>

          <button type="button" onClick={() => navigateTo('find_artisans')} className="w-full py-3.5 bg-[#16858F] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 btn-press">
            Find an Artisan <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
