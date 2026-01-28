// 🎨 Modern Input Component - Brain AI Design System
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-card dark:bg-neutral-900 px-4 py-2 text-base transition-all duration-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-neutral-200 dark:border-neutral-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900',
        error: 'border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900',
        success: 'border-green-300 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900',
      },
      inputSize: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputV2Props
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  clearable?: boolean;
  onClear?: () => void;
}

const InputV2 = React.forwardRef<HTMLInputElement, InputV2Props>(
  (
    {
      className,
      variant,
      inputSize,
      type = 'text',
      icon,
      iconPosition = 'left',
      clearable = false,
      onClear,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      setInternalValue('');
      onClear?.();
    };

    const showClearButton = clearable && internalValue;

    return (
      <div className="relative w-full">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
            {icon}
          </div>
        )}

        <input
          type={type}
          className={cn(
            inputVariants({ variant, inputSize, className }),
            icon && iconPosition === 'left' && 'pl-10',
            (icon && iconPosition === 'right') || showClearButton ? 'pr-10' : ''
          )}
          ref={ref}
          value={value !== undefined ? value : internalValue}
          onChange={handleChange}
          {...props}
        />

        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {icon && iconPosition === 'right' && !showClearButton && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
            {icon}
          </div>
        )}
      </div>
    );
  }
);

InputV2.displayName = 'InputV2';

// Specialized Search Input
export const SearchInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputV2Props, 'icon' | 'iconPosition'>
>(({ className, ...props }, ref) => {
  return (
    <InputV2
      ref={ref}
      type="search"
      icon={<Search className="h-4 w-4" />}
      iconPosition="left"
      clearable
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export { InputV2, inputVariants };
