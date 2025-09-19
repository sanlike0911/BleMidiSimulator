import React from 'react';

const PlugZapIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    <path d="M18 13v-3" />
    <path d="M21 10h-3" />
  </svg>
);

export default PlugZapIcon;
