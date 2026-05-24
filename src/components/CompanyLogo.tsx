import React from 'react';
import { cn } from '../lib/utils';
import { Building2 } from 'lucide-react';

interface CompanyLogoProps {
  symbol: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CompanyLogo({ symbol, className, size = 'md' }: CompanyLogoProps) {
  const [error, setError] = React.useState(false);
  const cleanSymbol = symbol.split('.')[0].toUpperCase(); // Remove .AX, .L etc for logo search

  const sizeClasses = {
    sm: 'w-4 h-4 text-[8px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-12 h-12 text-[12px]',
    xl: 'w-16 h-16 text-[16px]',
  };

  // Using a common public API for stock logos
  // Many developers use clearbit or specialized providers
  // financialmodelingprep is a good fallback for common symbols
  const logoUrl = `https://financialmodelingprep.com/image-stock/${cleanSymbol}.png`;

  if (error) {
    return (
      <div className={cn(
        "bg-muted border border-border rounded-lg flex items-center justify-center font-mono font-bold text-muted-foreground uppercase",
        sizeClasses[size],
        className
      )}>
        {cleanSymbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative flex-shrink-0 bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-border flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <img
        src={logoUrl}
        alt={symbol}
        className="w-full h-full object-contain p-1"
        onError={() => setError(true)}
      />
    </div>
  );
}
