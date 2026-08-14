import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService, TradeServicesMap, LifeCampLocations } from '../services/api';
import { OfflineBanner } from '../components/OfflineBanner';
import { Wrench, ShieldCheck, Check, ArrowRight, Upload, Phone, FileText, Sparkles } from 'lucide-react';

export function ArtisanSignupScreen() {
  const { navigateTo, setCurrentUser, setUserRole, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('8039998877');
  const [trade, setTrade] = useState('Plumbing');
  const [location, setLocation] = useState(LifeCampLocations[0]);
  const [selectedServices, setSelectedServices] = useState(['Leak Repair', 'Pipe Installation']);
  const [nin, setNin] = useState('12345678901');
  const [workPhotos, setWorkPhotos] = useState([
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80'
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const availableServices = TradeServicesMap[trade] || [];

  const handleToggleService = (service) => {
    if (selectedServices.includes(service)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter(s => s !== service));
      } else {
        showToast('Please keep at least 1 service selected.', 'info');
      }
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && (!firstName || !lastName)) {
      setError('Please enter your first and last name.');
      return;
    }
    if (step === 3 && (!nin || nin.length !== 11)) {
      setError('Please enter a valid 11-digit National Identification Number (NIN).');
      return;
    }
    if (step === 4 && selectedServices.length === 0) {
      setError('Please select at least 1 specific service you provide.');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmitSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await ApiService.signupArtisan({
        first_name: firstName,
        last_name: lastName,
        phone: `+234${phone.replace(/^0+/, '')}`,
        trade,
        location,
        services: selectedServices,
        nin,
        work_photos: workPhotos
      });

      setLoading(false);
      setUserRole('artisan');
      showToast('Signup submitted! Verification pending.', 'success');
      // Navigate to Verification Pending screen
      navigateTo('artisan_pending', { artisanId: res.artisanId });
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] pb-12">
      <Header title="Artisan Registration" backTo="onboarding" />
      <OfflineBanner onRetry={handleSubmitSignup} />

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card animate-fade-in space-y-6">
          
          {/* Progress Bar Header */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-2">
              <span>Step {step} of 5</span>
              <span className="text-[#16858F]">
                {step === 1 ? 'Personal Info' : step === 2 ? 'Trade' : step === 3 ? 'NIN ID' : step === 4 ? 'Services' : 'Photos'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#16858F] transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* STEP 1: PERSONAL DETAILS */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold font-['Outfit'] text-[#0E3B40]">Personal Information</h2>
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Sunday"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-[#16858F] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Okafor"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-[#16858F] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase mb-1">Phone Number (+234)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-[#16858F] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-4 bg-[#16858F] text-white font-bold rounded-2xl flex items-center justify-center gap-2 btn-press"
              >
                <span>Continue to Trade Selection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: TRADE CATEGORY */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold font-['Outfit'] text-[#0E3B40]">Select Main Trade</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {Object.keys(TradeServicesMap).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTrade(t);
                      setSelectedServices(TradeServicesMap[t].slice(0, 2));
                    }}
                    className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${
                      trade === t
                        ? 'bg-[#16858F] text-white border-[#16858F] shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-2xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-2/3 py-3.5 bg-[#16858F] text-white font-bold rounded-2xl flex items-center justify-center gap-2 btn-press"
                >
                  <span>Next: NIN ID</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: NIN INPUT (Explicit Requirement) */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold font-['Outfit'] text-[#0E3B40]">NIN Identity Verification</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your 11-digit National Identification Number. Verified against government registry.
                </p>
              </div>

              <div className="bg-[#E8F5F6] p-3.5 rounded-2xl border border-[#16858F]/20 text-xs text-[#0E3B40] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16858F] flex-shrink-0" />
                <span>NIN is strictly confidential. Clients will only see a "NIN Verified" checkmark.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase mb-1">11-Digit NIN Number</label>
                <input
                  type="text"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678901"
                  maxLength={11}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-extrabold tracking-[0.2em] text-[#0E3B40] focus:border-[#16858F] focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-2xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-2/3 py-3.5 bg-[#16858F] text-white font-bold rounded-2xl flex items-center justify-center gap-2 btn-press"
                >
                  <span>Next: Services</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SERVICES CHIPS MULTI-SELECT (Explicit Requirement) */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold font-['Outfit'] text-[#0E3B40]">Select Services ({trade})</h2>
                <p className="text-xs text-slate-500 mt-1">Tap to select the specific skills you offer in Life Camp.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableServices.map((service) => {
                  const isSelected = selectedServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => handleToggleService(service)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#16858F] text-white border-[#16858F] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{service}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-2xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-2/3 py-3.5 bg-[#16858F] text-white font-bold rounded-2xl flex items-center justify-center gap-2 btn-press"
                >
                  <span>Next: Photos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: WORK PHOTOS & SUBMIT */}
          {step === 5 && (
            <form onSubmit={handleSubmitSignup} className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold font-['Outfit'] text-[#0E3B40]">Work Photos & Submit</h2>
                <p className="text-xs text-slate-500 mt-1">Provide sample photos of your completed projects.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {workPhotos.map((url, i) => (
                  <img key={i} src={url} alt="Work sample" className="w-full h-28 object-cover rounded-2xl border border-slate-200" />
                ))}
                <div className="h-28 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-2 text-center text-slate-400 bg-slate-50">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Sample Uploaded</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit for Admin Verification</span>
                    <ShieldCheck className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
