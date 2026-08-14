'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:ring-primary border border-transparent",
    secondary: "bg-surface-secondary text-foreground hover:bg-border focus:ring-border border border-transparent",
    outline: "bg-surface text-foreground border border-border hover:bg-surface-secondary focus:ring-border",
    danger: "bg-danger text-white hover:opacity-90 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:ring-danger border border-transparent",
    ghost: "bg-transparent text-muted hover:bg-surface-secondary hover:text-foreground focus:ring-border",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
}
