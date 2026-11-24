import { useState } from 'react';

interface TeamBadgeProps {
  name: string;
  shortName: string;
  logo?: string;
  color: string;
  size?: 'sm' | 'md';
}

export function TeamBadge({ name, shortName, logo, color, size = 'sm' }: TeamBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  if (logo && !imgError) {
    return (
      <div
        className={`${dim} rounded-lg bg-white/10 border border-white/15 p-1 flex items-center justify-center shrink-0 overflow-hidden`}
      >
        <img
          src={logo}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dim} rounded-lg border border-white/20 flex items-center justify-center font-mono text-[10px] font-bold text-white shrink-0`}
      style={{ backgroundColor: color || '#1E293B' }}
      aria-hidden="true"
    >
      {shortName.slice(0, 3)}
    </div>
  );
}
