import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Bespoke Active Tasks Icon: Precision Geometric Diamond & Quill
export const LuxeTaskIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 2" />
    <path d="M8.5 12.5L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 2. Bespoke Current Streak Icon: Radial Solar Cadence / Luminous Ember
export const LuxeStreakIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.4" />
    <path
      d="M12 4.5V2M12 22V19.5M4.5 12H2M22 12H19.5M6.7 6.7L5 5M19 19L17.3 17.3M17.3 6.7L19 5M5 19L6.7 17.3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

// 3. Bespoke Focus Time Icon: Swiss Horology Chronometer Dial / Tourbillon Aperture
export const LuxeFocusIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <path d="M12 6V12L15.5 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M12 2V3.5M12 20.5V22M2 12H3.5M20.5 12H22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 4. Bespoke Velocity Icon: Precision Vector Delta / Momentum Ascendant
export const LuxeVelocityIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 16.5L10.5 10L14.5 14L20 7.5M20 7.5H15.5M20 7.5V12"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="4" cy="16.5" r="1.5" fill="currentColor" />
    <circle cx="10.5" cy="10" r="1.5" fill="currentColor" />
    <circle cx="14.5" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

// 5. Bespoke Luxury Lock-In Aperture
export const LuxeApertureIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M12 3V6M12 18V21M3 12H6M18 12H21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
