import React from 'react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';

const content = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms describe how clients and artisans use the Artiva marketplace.',
    sections: [
      ['Using Artiva', 'Use Artiva only for legitimate local-service requests and professional artisan services.'],
      ['Job payments', 'Artiva uses pay-per-job escrow. Funds are associated with a specific job, not a stored wallet balance.'],
      ['Accounts', 'Keep your account information accurate and do not share verification codes with anyone.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains the information Artiva needs to operate its marketplace experience.',
    sections: [
      ['Information we collect', 'Account details, job information, and verification information needed to support your use of Artiva.'],
      ['How information is used', 'Information is used to match jobs, protect users, process the frontend workflow, and improve the service.'],
      ['Verification information', 'Sensitive identity information is never displayed publicly to clients.'],
    ],
  },
};

export function LegalPage({ type }) {
  const page = content[type];

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar />
      <main className="flex-1">
        <section className="bg-splash-radial text-white py-14 px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">{page.title}</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto mt-2">{page.intro}</p>
        </section>
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
          {page.sections.map(([title, description]) => (
            <article key={title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="font-bold text-[#0E3B40] font-['Outfit']">{title}</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">{description}</p>
            </article>
          ))}
          <p className="text-xs text-slate-500 text-center pt-2">Detailed legal terms will be published before public launch.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
