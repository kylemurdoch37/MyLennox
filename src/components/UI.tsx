import React from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-[#141414] text-white hover:bg-opacity-90',
      secondary: 'bg-[#E4E3E0] text-[#141414] hover:bg-opacity-80',
      outline: 'border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white',
      ghost: 'text-[#141414] hover:bg-[#E4E3E0]',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-xs font-semibold uppercase tracking-wider text-[#141414]/60">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'px-4 py-3 rounded-xl border border-[#141414]/10 bg-white focus:border-[#141414] focus:ring-1 focus:ring-[#141414] outline-none transition-all',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

export const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      'bg-white border border-[#141414]/10 rounded-2xl p-6 transition-all',
      onClick && 'cursor-pointer hover:border-[#141414] active:scale-[0.99]',
      className
    )}
  >
    {children}
  </div>
);

export const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'warning' | 'success' | 'error' }) => {
  const variants = {
    default: 'bg-[#141414]/5 text-[#141414]',
    warning: 'bg-amber-100 text-amber-900',
    success: 'bg-emerald-100 text-emerald-900',
    error: 'bg-red-100 text-red-900',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter', variants[variant], className)}>
      {children}
    </span>
  );
};
