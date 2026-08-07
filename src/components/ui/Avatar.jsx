import { cn, getInitials } from '../../utils/formatters';
import { useState, useEffect } from 'react';

export default function Avatar({ name, src, size = 'md', className = '', rounded = 'full' }) {
  const [broken, setBroken] = useState(false);
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };
  const radius = rounded === 'xl' ? 'rounded-xl' : 'rounded-full';

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <img
        key={src}
        src={src}
        alt={name || 'Logo'}
        onError={() => setBroken(true)}
        className={cn(radius, 'object-cover bg-white shrink-0 border border-border/60', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        radius,
        'bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0',
        'dark:bg-primary/20 dark:text-primary-light',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
