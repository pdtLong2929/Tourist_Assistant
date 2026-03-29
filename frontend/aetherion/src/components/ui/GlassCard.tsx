import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className = '', style, ...props }: GlassCardProps) {
  return (
    <div 
      className={`glass-panel ${className}`} 
      style={{ 
        padding: '1.5rem',
        marginBottom: '1rem',
        ...style // Merges the custom styles from BookingPage
      }}
      {...props} // Passes down any other standard div attributes
    >
      {children}
    </div>
  );
}