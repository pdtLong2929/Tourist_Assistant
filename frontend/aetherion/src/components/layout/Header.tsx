import Link from 'next/link';

export function Header() {
  return (
    <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2.5rem', borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 100, borderRadius: '0', background: 'rgba(11, 15, 25, 0.85)' }}>
      <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1 className="neon-text-blue" style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '2px' }}>AETHERION</h1>
      </Link>
      <nav style={{ display: 'flex', gap: '3rem' }}>
        <Link href="/booking" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '500', transition: 'color 0.2s' }}>Ride Dispatch</Link>
        <Link href="/renting/suggestions" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '500', transition: 'color 0.2s' }}>AI Suggestions</Link>
        <Link href="/tour-judging" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '500', transition: 'color 0.2s' }}>Tour Telemetry</Link>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
         <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00F0FF', boxShadow: '0 0 10px #00F0FF' }}></div>
         <span style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>SYSTEM ONLINE</span>
      </div>
    </header>
  );
}
