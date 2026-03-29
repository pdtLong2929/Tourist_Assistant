import React from 'react';

export function DataRing({ score, label }: { score: number, label: string }) {
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - score / 100 * circumference;

  const color = score > 80 ? '#00F0FF' : score > 50 ? '#B026FF' : '#FF3366';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        height={radius * 2}
        width={radius * 2}
       >
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dy=".3em" 
          fill="#fff" 
          fontSize="3rem"
          fontFamily="var(--font-outfit)"
        >
          {score}
        </text>
      </svg>
      <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
        {label}
      </div>
    </div>
  );
}
