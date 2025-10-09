"use client";

import React from 'react';

// Mobile-friendly UI components

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCard: React.FC<MobileCardProps> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 ${className}`}>
    {children}
  </div>
);

interface MobileCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  actions 
}) => (
  <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-blue-50 to-indigo-50">
    <div className="flex items-center gap-2 min-w-0">
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-700 truncate">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && (
      <div className="flex-shrink-0 flex ml-auto">
        {actions}
      </div>
    )}
  </div>
);

interface MobileButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  icon,
  className = '',
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };
  
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-2.5 text-base',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-md font-medium flex items-center justify-center gap-1.5 
        transition-colors duration-200
        ${className}
      `}
    >
      {icon}
      {children}
    </button>
  );
};

interface MobileSearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-700"
    />
    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
      <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  </div>
);

interface MobileListProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileList: React.FC<MobileListProps> = ({ children, className = '' }) => (
  <div className={`divide-y divide-gray-100 ${className}`}>
    {children}
  </div>
);

interface MobileListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileListItem: React.FC<MobileListItemProps> = ({
  children,
  onClick,
  className = '',
}) => (
  <div
    onClick={onClick}
    className={`p-3 sm:p-4 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${className}`}
  >
    {children}
  </div>
);

interface MobileBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const MobileBadge: React.FC<MobileBadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};
