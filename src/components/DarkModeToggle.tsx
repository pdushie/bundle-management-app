"use client";

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/themeProvider';

export default function DarkModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="relative">
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${
                theme === value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
            title={`Switch to ${label.toLowerCase()} mode`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      
      {/* Show current resolved theme indicator */}
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800">
        <div
          className={`w-full h-full rounded-full ${
            resolvedTheme === 'dark' 
              ? 'bg-blue-600 dark:bg-blue-400' 
              : 'bg-yellow-500'
          }`}
          title={`Currently using ${resolvedTheme} theme`}
        />
      </div>
    </div>
  );
}
