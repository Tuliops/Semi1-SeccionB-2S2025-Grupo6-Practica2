import React from 'react';
import { ChefHat } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'lg', 
  text = 'Cargando...',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Spinner exterior */}
        <div className={`absolute inset-0 border-4 border-amber-500/20 rounded-full`}></div>
        {/* Spinner animado */}
        <div className={`absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin`}></div>
        {/* Icono central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ChefHat size={size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 20 : 24} className="text-amber-500" />
        </div>
      </div>
      {text && (
        <p className="text-gray-400 text-sm animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;