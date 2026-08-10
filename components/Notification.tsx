'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useState } from 'react';

export function Toast({
  type = 'info',
  title,
  message,
  onClose,
  autoClose = true,
}: {
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const colors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  if (!isVisible) return null;

  if (autoClose) {
    setTimeout(handleClose, 3000);
  }

  return (
    <div className={`fixed top-4 right-4 border-2 rounded-lg p-4 shadow-lg ${colors[type]} z-50`}>
      <div className="flex items-start gap-3">
        <div className={iconColors[type]}>{icons[type]}</div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>
        </div>
        <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  actions,
}: {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {actions && <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}
