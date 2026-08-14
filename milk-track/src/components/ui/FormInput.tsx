'use client';

import { useField } from 'formik';
import { ReactNode } from 'react';

interface FormInputProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

export default function FormInput({ label, icon, className = '', ...props }: FormInputProps) {
  const [field, meta] = useField(props);
  const hasError = Boolean(meta.touched && meta.error);

  return (
    <div className={`mb-5 ${className}`}>
      <label htmlFor={props.name} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            {icon}
          </div>
        )}
        <input
          {...field}
          {...props}
          id={props.name}
          className={`block w-full rounded-[10px] border bg-surface ${
            hasError 
              ? 'border-danger text-danger focus:border-danger focus:ring-1 focus:ring-danger' 
              : 'border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50'
          } ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 text-sm disabled:bg-surface-secondary disabled:text-muted transition-colors duration-200 outline-none shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]`}
        />
      </div>
      {hasError ? (
        <div className="mt-1.5 text-sm text-danger flex items-center font-medium">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {meta.error}
        </div>
      ) : null}
    </div>
  );
}
