'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BouncingDotsProps extends React.ComponentProps<'span'> {
  dots?: number;
  size?: 'sm' | 'md' | 'lg';
}

function BouncingDots({
  className,
  dots = 3,
  size = 'md',
  ...props
}: BouncingDotsProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-9 h-9',
  };

  return (
    <>
      <style>{`
        @keyframes loading-ui-bouncing-dots {
          0%,
          100% {
            transform: scale(0.7);
            opacity: 0.4;
          }

          50% {
            transform: scale(1.3);
            opacity: 1;
          }
        }
      `}</style>
      <span
        role="status"
        className={cn('inline-flex items-center gap-[12%]', sizeClasses[size], className)}
        {...props}
      >
        {Array.from({ length: dots }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="inline-block aspect-square grow rounded-full bg-current"
            style={{
              animation: 'loading-ui-bouncing-dots var(--duration, 1.4s) ease-in-out infinite',
              animationDelay: `calc(var(--delay, 0.2s) * ${index})`,
            }}
          />
        ))}
        <span className="sr-only">Loading</span>
      </span>
    </>
  );
}

export interface TableDataLoaderProps {
  colSpan?: number;
  message?: string;
  className?: string;
}

export function TableDataLoader({ colSpan = 8, message = 'Loading records...', className }: TableDataLoaderProps) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('py-14 text-center', className)}>
        <div className="flex flex-col items-center justify-center gap-2.5">
          <BouncingDots className="w-8 h-8 text-amber-500" />
          <span className="text-xs font-semibold text-slate-500">{message}</span>
        </div>
      </td>
    </tr>
  );
}

export { BouncingDots };
