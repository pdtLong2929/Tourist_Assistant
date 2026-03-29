'use client';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import React, { useState } from 'react';

export default function RentingSuggestion() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = () => {
    setLoading(true);
    // Simulating deterministic rule evaluation
    setTimeout(() => {
      setResult({
        vehicle: 'Cyber SUV X',
        reason: 'AWD capabilities strictly match the required terrain for Snowy Aspen based on the safety requirements.'
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div style={{ padding: '4rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="neon-text-blue" style={{ textAlign: 'center', marginBottom: '1rem' }}>AI Concierge Suggestions</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        Deterministic vehicle matching based on explicit destination environmental factors.
      </p>

      <GlassCard>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="E.g., I am taking 4 people to the snowy mountains of Aspen" 
            style={{ flex: 1, padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--font-inter)' }}
          />
          <NeonButton onClick={handleSearch}>Analyze</NeonButton>
        </div>
      </GlassCard>

      {loading && (
        <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--accent-purple)' }}>
          <p className="neon-text-blue">Analyzing terrain... Checking weather factors...</p>
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: '3rem' }}>
           <GlassCard style={{ borderTop: '4px solid var(--accent-blue)' }}>
            <h2>Top Recommended: {result.vehicle}</h2>
            <div style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderLeft: '4px solid var(--accent-blue)', marginTop: '1rem' }}>
              <strong>Why this vehicle?</strong><br />
              <span style={{ color: 'var(--text-secondary)' }}>{result.reason}</span>
            </div>
           </GlassCard>
        </div>
      )}
    </div>
  );
}
