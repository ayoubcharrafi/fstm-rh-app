import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={ref}
        className={`rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  ),
);
Input.displayName = 'Input';
