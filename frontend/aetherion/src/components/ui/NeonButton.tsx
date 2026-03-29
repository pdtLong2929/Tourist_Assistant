'use client';

import React, { useState } from 'react';

// 1. Extend standard button attributes so TypeScript allows 'style', 'disabled', etc.
interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function NeonButton({ 
  children, 
  className = '', 
  style, 
  onMouseEnter, 
  onMouseLeave, 
  ...props 
}: NeonButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button 
      className={`neon-button ${className}`}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter(e); // Pass through external mouse enter if provided
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave(e); // Pass through external mouse leave if provided
      }}
      style={{
        background: isHovered ? 'var(--accent-blue)' : 'transparent',
        border: '1px solid var(--accent-blue)',
        color: isHovered ? '#000' : 'var(--accent-blue)',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 0 20px rgba(0, 240, 255, 0.6)' : '0 0 10px rgba(0, 240, 255, 0.2)',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        fontFamily: 'var(--font-outfit)',
        ...style // 2. Merge incoming styles LAST so they apply correctly
      }}
      {...props} // 3. Spread standard props (like onClick, disabled) onto the button
    >
      {children}
    </button>
  );
}