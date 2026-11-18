'use client'

const WORD = 'CERCLE OF BEAUTY'

/** Full-screen main loader (pure CSS animation, no logo image) */
export function AppLoader({ message }: { message?: string }) {
  return (
    <div className="app-loader" role="status" aria-live="polite">
      <div className="app-loader-orbit" aria-hidden="true">
        <span className="o1" />
        <span className="o2" />
        <span className="o3" />
        <span className="core" />
        <span className="dot" />
      </div>
      <div className="app-loader-word font-anton" aria-hidden="true">
        {WORD.split('').map((c, i) => (
          <i key={i} className={c === ' ' ? 'sp' : undefined} style={{ ['--i' as string]: i }}>
            {c === ' ' ? '' : c}
          </i>
        ))}
      </div>
      <div className="app-loader-bar" aria-hidden="true" />
      <p className="app-loader-msg">{message ?? 'Chargement'}</p>
      <span className="sr-only">{message ?? 'Chargement'}</span>
    </div>
  )
}
