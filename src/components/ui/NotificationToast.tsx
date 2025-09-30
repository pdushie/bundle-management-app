import React from 'react';
import { AlertCircle, CheckCircle, X, Info } from 'lucide-react';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onClose }) => {
  // Define colors and icons based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          icon: <CheckCircle className="h-5 w-5" />
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          icon: <AlertCircle className="h-5 w-5" />
        };
      case 'info':
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-500',
          icon: <Info className="h-5 w-5" />
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`p-4 rounded-md ${styles.bgColor} border ${styles.borderColor} flex items-start shadow-md`}>
      <div className={`mr-3 flex-shrink-0 ${styles.iconColor}`}>
        {styles.icon}
      </div>
      <div className={`flex-grow ${styles.textColor}`}>
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          className={`ml-3 flex-shrink-0 ${styles.textColor} hover:bg-opacity-20 hover:bg-gray-700 p-1 rounded-full`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
