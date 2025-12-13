import React from 'react';
import * as LucideIcons from 'lucide-react';

// Icon component props interface
interface IconProps {
  name: keyof typeof LucideIcons;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'white' | 'gray' | 'inherit';
  className?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'white',
  className = '',
  ariaLabel,
  ariaHidden = false
}) => {
  // Get the icon component from LucideIcons
  const IconComponent = LucideIcons[name] as React.ElementType;
  
  // Check if the icon exists and is a valid component
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const colorClasses = {
    primary: 'text-blue-400',
    secondary: 'text-purple-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    info: 'text-cyan-400',
    white: 'text-white',
    gray: 'text-gray-400',
    inherit: ''
  };

  const combinedClasses = `${sizeClasses[size]} ${colorClasses[color]} ${className} shrink-0`;

  return (
    <IconComponent
      className={combinedClasses}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
};

export default Icon;