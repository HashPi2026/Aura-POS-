import React from 'react';

interface KwikioLogoMarkProps {
  size?: number | string;
  className?: string;
  ringColor?: string;
  dotColor?: string;
}

/**
 * Official Kwikio Aperture Logo Mark.
 * An open circular arc with rounded caps and a vibrant coral aperture dot.
 */
export const KwikioLogoMark: React.FC<KwikioLogoMarkProps> = ({
  size = 32,
  className = '',
  ringColor,
  dotColor = '#FF5B2E',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Kwikio Logo"
    >
      {/* 286.5 degree circular arc with rounded caps */}
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke={ringColor || 'currentColor'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="170 44"
      />
      {/* Vibrant coral aperture dot */}
      <circle cx="77.2" cy="29.5" r="8" fill={dotColor} />
    </svg>
  );
};

interface KwikioAppIconProps {
  size?: number;
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
}

/**
 * Official Kwikio Squircle App Icon matching Concept 1.
 */
export const KwikioAppIcon: React.FC<KwikioAppIconProps> = ({
  size = 36,
  className = '',
  variant = 'auto',
}) => {
  const bgClass =
    variant === 'light'
      ? 'bg-[#FAF9F5] text-[#14161A] shadow-xs'
      : variant === 'dark'
      ? 'bg-[#14161A] text-white shadow-xs'
      : 'bg-[#FAF9F5] dark:bg-slate-800 text-[#14161A] dark:text-white shadow-xs';

  return (
    <div
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      className={`flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10 ${bgClass} ${className}`}
    >
      <KwikioLogoMark size={Math.round(size * 0.72)} />
    </div>
  );
};

interface KwikioLogoProps {
  markSize?: number;
  className?: string;
  showSubtitle?: boolean;
  inline?: boolean;
}

/**
 * Full Kwikio Brand Lockup: Mark + Typography + Subtitle.
 */
export const KwikioLogo: React.FC<KwikioLogoProps> = ({
  markSize = 36,
  className = '',
  showSubtitle = true,
  inline = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <KwikioAppIcon size={markSize} />
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm sm:text-base tracking-[0.18em] text-slate-900 dark:text-white leading-tight">
            KWIKIO
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            POS
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-semibold tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase leading-none mt-0.5">
            Point of Sale
          </span>
        )}
      </div>
    </div>
  );
};

export default KwikioLogo;
