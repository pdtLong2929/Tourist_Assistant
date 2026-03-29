'use client';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { MapPin, Navigation, Car } from 'lucide-react';
import React, { useState } from 'react';

// Simulated external backend driver data
const MOCK_DRIVERS = [
  { id: 'D-801', type: 'Cyber SUV', eta: '3 mins', x: 30, y: 35, heading: 45 },
  { id: 'D-442', type: 'Aero Sedan', eta: '7 mins', x: 70, y: 15, heading: 120 },
  { id: 'D-99X', type: 'Hypercar', eta: '12 mins', x: 80, y: 80, heading: 270 }
];

export default function BookingPage() {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const handleDispatch = () => {
    alert(`Backend API Triggered: Booking ${selectedDriver}`);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
      
      {/* Left Sidebar: Booking Controls */}
      <aside style={{ width: '420px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10, borderRight: '1px solid var(--glass-border)', background: 'rgba(11, 15, 25, 0.5)' }}>
        <h2 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '10px' }} className="neon-text-blue">
           <MapPin size={24} /> Dispatch Center
        </h2>
        
        <GlassCard>
          <h3 style={{ margin: '0 0 1rem 0' }}>Route Assignment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
               {/* Client Origin */}
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00F0FF' }} />
                 <div style={{ flex: 1 }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PICKUP (Live Location)</span>
                   <input type="text" readOnly placeholder="Aspen, Colorado (39.1911° N)" style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontWeight: 'bold' }} />
                 </div>
               </div>
               
               <div style={{ width: 2, height: 25, background: 'rgba(255,255,255,0.2)', marginLeft: 5, marginTop: 5, marginBottom: 5 }} />
               
               {/* Destination */}
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '0', background: '#B026FF' }} />
                 <div style={{ flex: 1 }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DESTINATION</span>
                   <input type="text" placeholder="Enter Drop-off Point..." style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontWeight: 'bold' }} />
                 </div>
               </div>
            </div>
          </div>
        </GlassCard>

        <h3 style={{ margin: '0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>Active Units Proximity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '5px' }}>
           {MOCK_DRIVERS.map(driver => (
             <GlassCard 
               key={driver.id} 
               className="vehicle-card" 
               style={{ 
                 cursor: 'pointer', 
                 border: selectedDriver === driver.id ? '1px solid var(--accent-blue)' : '1px solid var(--glass-border)',
                 background: selectedDriver === driver.id ? 'rgba(0, 240, 255, 0.05)' : 'var(--glass-bg)',
                 transition: 'all 0.2s',
                 margin: 0
               }}
             >
               <div onClick={() => setSelectedDriver(driver.id)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Car size={32} color={selectedDriver === driver.id ? '#00F0FF' : '#9CA3AF'} />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.2rem', color: selectedDriver === driver.id ? '#fff' : 'var(--text-secondary)' }}>{driver.type}</h4>
                        <p style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '0.9rem', fontWeight: 'bold' }}>Unit {driver.id}</p>
                      </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', fontSize: '1.2rem' }}>{driver.eta}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>away</span>
                   </div>
                 </div>
               </div>
             </GlassCard>
           ))}
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
           <NeonButton 
             onClick={handleDispatch}
             style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', opacity: selectedDriver ? 1 : 0.5, pointerEvents: selectedDriver ? 'auto' : 'none' }}>
             {selectedDriver ? `Dispatch Unit ${selectedDriver}` : 'Select a Vehicle'}
           </NeonButton>
        </div>
      </aside>

      {/* Right Area: Web Map Simulation */}
      <main style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at center, #111A2C 0%, #0B0F19 100%)', overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
         
         {/* Client Position marker */}
         <div style={{ position: 'absolute', top: '50%', left: '40%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
            <div style={{ width: 80, height: 80, background: 'rgba(0, 240, 255, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'map-pulse 2s infinite' }}>
              <div style={{ width: 24, height: 24, background: '#00F0FF', borderRadius: '50%', boxShadow: '0 0 15px #00F0FF' }} />
            </div>
            <div className="glass-panel" style={{ padding: '0.5rem 1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.8)', color: '#00F0FF', fontWeight: 'bold' }}>
              Client (You)
            </div>
         </div>

         {/* Driver markers */}
         {MOCK_DRIVERS.map(driver => (
            <div key={driver.id} onClick={() => setSelectedDriver(driver.id)} style={{ position: 'absolute', top: `${driver.y}%`, left: `${driver.x}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.5s ease', zIndex: 4, cursor: 'pointer' }}>
              {/* Highlight Ring for Selected Map Marker */}
              {selectedDriver === driver.id && (
                 <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', border: '2px solid #00F0FF', animation: 'spin 4s linear infinite', top: '-11px' }} />
              )}
              <div style={{ transform: `rotate(${driver.heading}deg)`, background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '50%' }}>
                <Navigation size={32} color={selectedDriver === driver.id ? '#00F0FF' : '#B026FF'} fill={selectedDriver === driver.id ? '#00F0FF' : '#B026FF'} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${selectedDriver === driver.id ? '#00F0FF' : 'var(--glass-border)'}`, padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold', color: selectedDriver === driver.id ? '#00F0FF' : '#fff' }}>
                {driver.id} • {driver.eta}
              </div>
            </div>
         ))}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes map-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.6); }
          70% { box-shadow: 0 0 0 25px rgba(0, 240, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
