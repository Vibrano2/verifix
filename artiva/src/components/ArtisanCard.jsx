import React from 'react';
import { ShieldCheck, Star, MapPin, CheckCircle, Award, ChevronRight } from 'lucide-react';

export function ArtisanCard({ artisan, onSelect, selected = false, showSelectButton = true }) {
  return (
    <div 
      className={`bg-white rounded-2xl p-4 border transition-all duration-200 shadow-card hover:shadow-card-hover ${
        selected ? 'border-[#16858F] ring-2 ring-[#16858F]/20' : 'border-slate-100'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <img
            src={artisan.work_photos[0] || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=200&q=80'}
            alt={`${artisan.first_name} ${artisan.last_name}`}
            className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm"
          />
          {artisan.verified && (
            <span className="absolute -bottom-1 -right-1 bg-[#16858F] text-white p-0.5 rounded-full ring-2 ring-white" title="Verified Artisan">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-bold text-[#0E3B40] text-base font-['Outfit'] truncate">
              {artisan.first_name} {artisan.last_name}
            </h3>
            {artisan.reputation_score && (
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-[#FAB804] text-[#D59F0F]" />
                <span className="text-xs font-bold text-amber-900">{artisan.reputation_score}</span>
              </div>
            )}
          </div>

          <p className="text-xs font-semibold text-[#16858F] mt-0.5">
            {artisan.trade} Specialist
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-0.5 text-slate-600 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#16858F]" />
              {artisan.distance_km} km away
            </span>
            <span>•</span>
            <span className="truncate">{artisan.location}</span>
          </div>
        </div>
      </div>

      {/* Badges: NIN Verified + Completed Jobs */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
        {artisan.nin_verified && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-semibold text-[11px]">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            NIN Verified
          </span>
        )}

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px]">
          <Award className="w-3 h-3 text-[#16858F]" />
          {artisan.completed_jobs} Jobs Completed
        </span>
      </div>

      {/* Services Multi-Select Chips */}
      {artisan.services && artisan.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {artisan.services.slice(0, 3).map((service, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-[#E8F5F6] text-[#0E3B40] text-[11px] font-medium rounded-md">
              {service}
            </span>
          ))}
          {artisan.services.length > 3 && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-md">
              +{artisan.services.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Tagline */}
      {artisan.tagline && (
        <p className="text-xs text-slate-600 italic mt-2.5 line-clamp-2">
          "{artisan.tagline}"
        </p>
      )}

      {/* Escrow Fee & Select CTA */}
      {showSelectButton && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
              Match Fee (Escrow)
            </span>
            <span className="text-sm font-bold text-[#0E3B40]">
              ₦{(artisan.match_fee || 1500).toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => onSelect && onSelect(artisan)}
            className="px-4 py-2 bg-[#16858F] hover:bg-[#0E5C63] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all btn-press touch-target"
          >
            <span>Select Artisan</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
