'use client';
import { GlassCard } from '@/components/ui/GlassCard';
import { DataRing } from '@/components/ui/DataRing';
import React, { useState } from 'react';

export default function TourJudging() {
  const [score, setScore] = useState(87);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
         <h1 className="neon-text-blue">Environmental Factor Scoring</h1>
         <p style={{ color: 'var(--text-secondary)' }}>Destination: Aspen, Colorado | Calculated at 14:00 UTC</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4rem' }}>
         <DataRing score={score} label="Aggregated Tour Score" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        <GlassCard>
           <h3>Weather Index</h3>
           <h2 className="neon-text-blue">92/100</h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sourced from National Weather API (Clear Skies)</p>
        </GlassCard>

        <GlassCard>
           <h3>Traffic Congestion</h3>
           <h2 style={{ color: '#B026FF' }}>75/100</h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sourced from TomTom API (Light localized traffic)</p>
        </GlassCard>

        <GlassCard>
           <h3>Safety Local Score</h3>
           <h2 className="neon-text-blue">95/100</h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sourced from Regional Safety DB (Historical high avg)</p>
        </GlassCard>
      </div>
    </div>
  );
}
