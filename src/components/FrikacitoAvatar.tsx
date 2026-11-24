import React from 'react';

interface FrikacitoAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const FrikacitoAvatar: React.FC<FrikacitoAvatarProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClass =
    size === 'xs'
      ? 'w-5 h-5'
      : size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-12 h-12'
      : 'w-10 h-10';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-linear-to-br from-[#0f5b53] via-[#127469] to-[#0b3f3a] p-0.5 ring-2 ring-[#f97316]/80 shadow-md shrink-0 overflow-hidden ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Fondo circular suave */}
        <defs>
          <radialGradient id="frikacitoBg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1c8b7e" />
            <stop offset="100%" stopColor="#0b4640" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#frikacitoBg)" />

        {/* Chaleco de seguridad SG-SST */}
        <path
          d="M22 94 C24 72 36 66 50 66 C64 66 76 72 78 94 Z"
          fill="#f97316"
        />
        <path
          d="M36 68 L50 86 L64 68 L58 66 L50 75 L42 66 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        {/* Cinta reflectiva */}
        <rect x="27" y="79" width="12" height="4" rx="1.5" fill="#fde047" />
        <rect x="61" y="79" width="12" height="4" rx="1.5" fill="#fde047" />

        {/* Orejitas */}
        <ellipse cx="27" cy="40" rx="9" ry="11" transform="rotate(-24 27 40)" fill="#f8a599" />
        <ellipse cx="28" cy="41" rx="5" ry="6.5" transform="rotate(-24 28 41)" fill="#f472b6" opacity="0.55" />
        <ellipse cx="73" cy="40" rx="9" ry="11" transform="rotate(24 73 40)" fill="#f8a599" />
        <ellipse cx="72" cy="41" rx="5" ry="6.5" transform="rotate(24 72 41)" fill="#f472b6" opacity="0.55" />

        {/* Cabecita amigable */}
        <circle cx="50" cy="50" r="24" fill="#fbc4b8" stroke="#e58f7d" strokeWidth="1.4" />

        {/* Mejillas rosadas */}
        <ellipse cx="34" cy="55" rx="4.2" ry="2.6" fill="#fb7185" opacity="0.45" />
        <ellipse cx="66" cy="55" rx="4.2" ry="2.6" fill="#fb7185" opacity="0.45" />

        {/* Ojos expresivos */}
        <circle cx="40" cy="46" r="3.7" fill="#0f172a" />
        <circle cx="60" cy="46" r="3.7" fill="#0f172a" />
        <circle cx="41.2" cy="44.7" r="1.3" fill="#ffffff" />
        <circle cx="61.2" cy="44.7" r="1.3" fill="#ffffff" />

        {/* Hocico característico amigable */}
        <ellipse cx="50" cy="55.5" rx="9.5" ry="6.8" fill="#f9978c" stroke="#df7669" strokeWidth="1" />
        <circle cx="46.6" cy="55.3" r="1.8" fill="#9f3932" />
        <circle cx="53.4" cy="55.3" r="1.8" fill="#9f3932" />

        {/* Sonrisa cordial */}
        <path
          d="M42 64.5 Q50 70.5 58 64.5"
          fill="none"
          stroke="#7f2b25"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Casco blanco de seguridad con franja naranja Frikaz */}
        <path
          d="M25 36 C25 20 36 12 50 12 C64 12 75 20 75 36 Z"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="1.2"
        />
        <path
          d="M44 13 L56 13 L54 34 L46 34 Z"
          fill="#f97316"
        />
        {/* Emblema escudito en el casco */}
        <circle cx="50" cy="24" r="5" fill="#0f5b53" stroke="#ffffff" strokeWidth="1.2" />
        <path
          d="M47.8 24.2 L49.4 25.8 L52.5 22.5"
          fill="none"
          stroke="#fed7aa"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Visera del casco */}
        <path
          d="M21 35 Q50 40 79 35 Q76 39 50 41 Q24 39 21 35 Z"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="0.9"
        />
      </svg>
    </span>
  );
};
