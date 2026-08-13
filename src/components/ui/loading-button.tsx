import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: (event?: any) => void | Promise<void>;
  type?: "button" | "submit" | "reset";
}

export function LoadingButton({
  children,
  loading = false,
  loadingText = "Generating...",
  icon,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={`relative transition-all duration-300 ${className} ${loading ? 'opacity-90 cursor-not-allowed' : ''}`}
      {...props}
    >
      <div className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${loading ? 'opacity-0 h-0 w-0 overflow-hidden absolute' : 'opacity-100'}`}>
        {children}
        {icon && <span className="-mr-1">{icon}</span>}
      </div>
      
      <div className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${loading ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden absolute'}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{loadingText}</span>
      </div>
    </Button>
  );
}
