import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] border border-transparent focus-visible:ring-[var(--btn-primary-bg)]',
        secondary:
          'bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-[var(--btn-secondary-border)] hover:bg-[var(--btn-secondary-hover)] focus-visible:ring-[var(--btn-secondary-bg)]',
        ghost:
          'bg-[var(--btn-ghost-bg)] text-[var(--btn-ghost-text)] border border-[var(--btn-ghost-border)] hover:bg-[var(--btn-ghost-hover)] focus-visible:ring-[var(--btn-ghost-bg)]',
        'ghost-dark':
          'bg-[var(--btn-ghost-dark-bg)] text-[var(--btn-ghost-dark-text)] border border-[var(--btn-ghost-dark-border)] hover:bg-[var(--btn-ghost-dark-hover)] focus-visible:ring-[var(--btn-ghost-dark-bg)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        sm: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };
