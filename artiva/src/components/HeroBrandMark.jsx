import React from 'react';
import { Cable, Hammer, Paintbrush, Waves, Wrench, Zap } from 'lucide-react';

const tradeIcons = [
  { Icon: Wrench, position: 'top-[4%] left-[13%]' },
  { Icon: Zap, position: 'top-[14%] right-[7%]' },
  { Icon: Hammer, position: 'top-[47%] right-[1%]' },
  { Icon: Paintbrush, position: 'bottom-[8%] right-[16%]' },
  { Icon: Cable, position: 'bottom-[3%] left-[28%]' },
  { Icon: Waves, position: 'top-[48%] left-[1%]' },
];

export function HeroBrandMark() {
  return (
    <div className="hero-brand-mark relative w-full max-w-[440px] aspect-square" aria-label="Artiva artisan services">
      <div className="hero-brand-atmosphere" aria-hidden="true" />
      <div className="hero-brand-orbit hero-brand-orbit-one" aria-hidden="true" />
      <div className="hero-brand-orbit hero-brand-orbit-two" aria-hidden="true" />

      {tradeIcons.map(({ Icon, position }, index) => (
        <div
          key={index}
          className={`hero-trade-icon absolute ${position} z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#16858F]/60 bg-[#06151F]/85 text-white sm:h-11 sm:w-11`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.6} />
        </div>
      ))}

      <div className="absolute inset-[22%] z-20 flex items-center justify-center">
        <img
          src="/logo.svg"
          alt="Artiva shield and crossed-tools mark"
          className="hero-brand-logo h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
