'use client';

import { ReactNode } from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: ReactNode;
}

export default function StatusBadge({ status, variant = 'neutral', icon }: StatusBadgeProps) {
  
  const styles = {
    success: "bg-success-subtle text-success border-success/20",
    warning: "bg-warning-subtle text-warning border-warning/20",
    danger: "bg-danger-subtle text-danger border-danger/20",
    info: "bg-info-subtle text-info border-info/20",
    neutral: "bg-surface-secondary text-foreground border-border",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${styles[variant]}`}>
      {icon && <span className="mr-1 -ml-0.5">{icon}</span>}
      {status}
    </span>
  );
}
