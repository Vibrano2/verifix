import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import confetti from 'canvas-confetti';
import { Star, ShieldCheck, CheckCircle2, Award, ArrowRight, MessageCircle } from 'lucide-react';

export function JobCompletionRatingModal({ job, artisan }) {
  const { navigateTo, activeJob, activeArtisan, showToast } = useApp();
  
  const targetJob = job || activeJob;
  const targetArtisan = artisan || activeArtisan;

  const [completed, setCompleted] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleConfirmCompletion = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Step 1: Call POST /jobs/:id/complete
      await ApiService.completeJob(targetJob.job_id);

      setLoading(false);
      setCompleted(true);
      showToast('Job confirmed complete! Escrow funds released to artisan.', 'success');

      // Trigger celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Step 2: Call POST /jobs/:id/rating
      await ApiService.rateJob(targetJob.job_id, rating, review);
      setLoading(false);
      showToast('Thank you for rating your artisan!', 'success');
      navigateTo('client_dash');
    } catch (err) {
      setLoading(false);
      if (err.status === 409) {
        // Handle 409 Conflict per API contract rule
        setAlreadyRated(true);
        setErrorMsg("You have already submitted a rating for this completed job.");
      } else {
        setErrorMsg(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Header title="Confirm Job Completion" backTo="client_dash" />

      <main className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card animate-fade-in space-y-6">
          
          {!completed ? (
            /* STEP 1: CONFIRM COMPLETION & RELEASE FUNDS */
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#E8F5F6] text-[#16858F] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 stroke-[2]" />
              </div>

              <div>
                <h1 className="text-2xl font-bold font-['Outfit'] text-[#0E3B40]">
                  Has the Artisan Completed the Job?
                </h1>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  Clicking confirm will release the match fee held in escrow to <strong>{targetArtisan?.first_name || 'Sunday'} {targetArtisan?.last_name || 'Okafor'}</strong>.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleConfirmCompletion}
                disabled={loading}
                className="w-full py-4 bg-[#2E7D32] hover:bg-[#1b5e20] text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirm Complete & Release Funds</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* STEP 2: RATING & REVIEW FORM */
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold font-['Outfit'] text-[#0E3B40]">
                  Payment Released! Rate {targetArtisan?.first_name || 'Artisan'}
                </h2>
                <p className="text-xs text-slate-500">
                  Your review helps maintain high quality standards in Life Camp.
                </p>
              </div>

              {alreadyRated && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-2xl text-center">
                  ⚠️ You've already rated this job. Thank you!
                </div>
              )}

              {errorMsg && !alreadyRated && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmitRating} className="space-y-5">
                {/* 5-Star Rating Selector */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={alreadyRated}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-9 h-9 ${
                          star <= rating
                            ? 'fill-[#FAB804] text-[#D59F0F]'
                            : 'fill-slate-100 text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-2">
                    Optional Written Review
                  </label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    disabled={alreadyRated}
                    placeholder="e.g. Arrived on time, fixed the leak neatly and cleaned up afterwards!"
                    rows={3}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-[#0E3B40] focus:border-[#16858F] focus:ring-2 focus:ring-[#16858F]/20 focus:outline-none disabled:opacity-50"
                  />
                </div>

                {alreadyRated ? (
                  <button
                    type="button"
                    onClick={() => navigateTo('client_dash')}
                    className="w-full py-4 bg-[#16858F] text-white font-bold text-base rounded-2xl"
                  >
                    Return to Dashboard
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all btn-press touch-target disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Submit Rating</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
