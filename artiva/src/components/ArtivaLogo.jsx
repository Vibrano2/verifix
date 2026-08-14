import React from 'react';

/**
 * Artiva Shield Logo Component
 * - Shield badge with #16858F outer border
 * - Crossed wrench & screwdriver in cobalt blue with gold handles
 * - Gold speed lines to the left of shield
 * - Gold star to the upper right
 * - Wordmark "Artiva" in #16D4C6 bold rounded sans-serif
 * - Optional tagline "verified. fast. protected."
 */
export function ArtivaLogo({ size = 'md', showWordmark = true, showTagline = false, isSplash = false, lightMode = false }) {
  const sizeClasses = {
    sm: { box: 'w-8 h-8', text: 'text-xl', tagline: 'text-[9px]' },
    md: { box: 'w-11 h-11', text: 'text-2xl', tagline: 'text-[10px]' },
    lg: { box: 'w-16 h-16', text: 'text-4xl', tagline: 'text-xs' },
    xl: { box: 'w-24 h-24', text: 'text-5xl', tagline: 'text-sm' },
  }[size] || { box: 'w-11 h-11', text: 'text-2xl', tagline: 'text-[10px]' };

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div className={`relative ${sizeClasses.box} flex-shrink-0`}>
        <img src="/logo.svg" alt="Artiva Logo" className="w-full h-full object-contain drop-shadow-sm" />
      </div>

      {showWordmark && (
        <div className="flex flex-col text-left">
          <span className={`font-extrabold tracking-tight font-['Outfit'] ${sizeClasses.text} leading-none ${isSplash ? 'text-[#16D4C6]' : 'text-white'}`}>
            Artiva
          </span>
          {showTagline && (
            <span className={`font-medium ${sizeClasses.tagline} text-[#16858F] tracking-wide mt-0.5`}>
              Verified. Fast. Protected.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
