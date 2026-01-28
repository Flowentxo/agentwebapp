// 🎨 Modern Card Component - Brain AI Design System
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-xl transition-all duration-200',
  {
    variants: {
      variant: {
        // Default - Clean card with border
        default: 'bg-card dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm',

        // Elevated - Floating card with shadow
        elevated: 'bg-card dark:bg-neutral-900 shadow-lg hover:shadow-xl',

        // Outlined - Prominent border
        outlined: 'bg-card dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700',

        // Flat - No border, subtle background
        flat: 'bg-neutral-50 dark:bg-neutral-800/50',

        // Interactive - Hover effects for clickable cards
        interactive: 'bg-card dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer active:scale-[0.99]',

        // Gradient - Brand gradient background
        gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg',

        // Glass - Glassmorphism effect
        glass: 'bg-card/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 dark:border-neutral-800/20 shadow-xl',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardV2Props
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const CardV2 = React.forwardRef<HTMLDivElement, CardV2Props>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
);
CardV2.displayName = 'CardV2';

// Card Header
const CardV2Header = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardV2Header.displayName = 'CardV2Header';

// Card Title
const CardV2Title = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100',
      className
    )}
    {...props}
  >
    {children}
  </h3>
));
CardV2Title.displayName = 'CardV2Title';

// Card Description
const CardV2Description = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));
CardV2Description.displayName = 'CardV2Description';

// Card Content
const CardV2Content = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CardV2Content.displayName = 'CardV2Content';

// Card Footer
const CardV2Footer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-6', className)}
    {...props}
  />
));
CardV2Footer.displayName = 'CardV2Footer';

export {
  CardV2,
  CardV2Header,
  CardV2Footer,
  CardV2Title,
  CardV2Description,
  CardV2Content,
};
