import React from 'react';

export const BullIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M95,35c-2-5-10-8-15-5c-5,3-7,10-5,15c2,5,10,8,15,5C95,47,97,40,95,35z M25,45c0-10,10-20,25-20s25,10,25,20v20h-50V45z M30,70h40l5,15H25L30,70z M15,50c-2-5-10-8-15-5c-5,3-7,10-5,15c2,5,10,8,15,5C15,62,17,55,15,50z" />
  </svg>
);

export const BearIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <circle cx="50" cy="50" r="40" opacity="0.1" />
    <path d="M50,20c-15,0-27,12-27,27c0,10,5,19,13,24c-3,5-5,11-5,17h38c0-6-2-12-5-17c8-5,13-14,13-24C77,32,65,20,50,20z M35,45c-2,0-4-2-4-4s2-4,4-4s4,2,4,4S37,45,35,45z M65,45c-2,0-4-2-4-4s2-4,4-4s4,2,4,4S67,45,65,45z M50,60c-5,0-10-2-10-5h20C60,58,55,60,50,60z" />
  </svg>
);
