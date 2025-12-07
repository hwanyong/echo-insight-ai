import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 text-gray-500">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium animate-pulse">Loading Map...</p>
    </div>
  );
};