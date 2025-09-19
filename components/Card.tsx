import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-xl font-bold mb-4 text-gray-200 border-b border-gray-700 pb-2">{title}</h2>
      {children}
    </div>
  );
};

export default Card;
