export default function LandingPage() {
  return (
    <main style={{ padding: '3rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '3rem' }}>
        <div>
          <h1 className="neon-text-blue" style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
            Central Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', margin: 0 }}>
            Real-time Vehicle Matrix and Environmental Telemetry
          </p>
        </div>
        
        {/* Client Position Dashboard Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', minWidth: '320px', borderTop: '4px solid var(--accent-blue)' }}>
           <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00F0FF', animation: 'pos-pulse 1.5s infinite' }}></span>
             Live Client Position
           </h3>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Latitude:</span>
             <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>39.1911° N</strong>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Longitude:</span>
             <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>106.8175° W</strong>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Routing Status:</span>
             <span className="neon-text-blue" style={{ fontWeight: 'bold' }}>Awaiting Dispatch</span>
           </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem' }}>
        
        <a href="/booking" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', height: '100%', cursor: 'pointer', borderTop: '4px solid var(--accent-blue)' }}>
            <h2>Ride Dispatch (Map)</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Track live assets with an Uber-style telemetry map. View all actively nearby vehicles assigned from the backend.</p>
          </div>
        </a>

        <a href="/renting/suggestions" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', height: '100%', cursor: 'pointer', borderTop: '4px solid var(--accent-purple)' }}>
            <h2>AI Concierge Rules</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Intelligent static mapping evaluating destination inputs directly to vehicle capabilities without hallucination.</p>
          </div>
        </a>

        <a href="/tour-judging" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', height: '100%', cursor: 'pointer', borderTop: '4px solid #fff' }}>
            <h2>Tour Scoring System</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Deterministic environmental factor calculations aggregating safety, weather, and traffic indices into a final score.</p>
          </div>
        </a>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pos-pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}} />
    </main>
  );
}
