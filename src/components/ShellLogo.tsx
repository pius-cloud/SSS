import React from 'react';

export const ShellLogo: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M32 6C17.5 6 6 17.5 6 31.5C6 40.5 11.2 48.2 18.8 52.5L21 57H43L45.2 52.5C52.8 48.2 58 40.5 58 31.5C58 17.5 46.5 6 32 6Z"
        fill="#FFC800"
        stroke="#F58220"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 52V11M26 52L17 15M38 52L47 15M22 52L10 25M42 52L54 25"
        stroke="#F58220"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
