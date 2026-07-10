import React, { useEffect } from 'react'

// Boxe de filtres GROUPES — port fidele de new/versus_group_filters_exact,
// affichee en modal overlay centre (au lieu du plein ecran 1600x960 de la maquette).
// Styles/bordures/couleurs repris tels quels. Toggle multi-select ; "Live Now" est
// desactive (aucune data de presence temps reel).

// key -> { label, icon, disabled }. L'ordre des colonnes = ordre de la maquette.
const COLS = [
  [
    { key: 'most-active', label: 'Most Active', icon: 'bolt' },
    { key: 'active-today', label: 'Active Today', icon: 'calendar' },
    { key: 'live-now', label: 'Live Now', icon: 'wifi', disabled: true },
  ],
  [
    { key: 'most-members', label: 'Most Members', icon: 'users' },
    { key: 'public', label: 'Public Groups', icon: 'globe' },
    { key: 'private', label: 'Private Groups', icon: 'lock' },
  ],
  [
    { key: 'fastest-growing', label: 'Fastest Growing', icon: 'trend' },
    { key: 'highest-win-rate', label: 'Highest Win Rate', icon: 'trend' },
    { key: 'most-wins', label: 'Most Wins', icon: 'trophy' },
  ],
  [
    { key: 'size-0-100', label: '0 – 100 Members', icon: 'user' },
    { key: 'size-100-1k', label: '100 – 1K Members', icon: 'users' },
    { key: 'all-sizes', label: 'All Sizes', icon: 'circle' },
  ],
]

const Svg = ({ d, sw = 1.85, children }) => (
  <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, flex: '0 0 22px', fill: 'none', stroke: '#f5f5f5', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
    {children || <path d={d} />}
  </svg>
)
const ICONS = {
  bolt: <Svg d="M13 2L5 13h6l-1 9 8-12h-6l1-8Z" />,
  calendar: <Svg><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>,
  wifi: <Svg><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" /><circle cx="12" cy="12" r="1.6" /></Svg>,
  users: <Svg><circle cx="9" cy="8" r="3" /><path d="M3 20v-2c0-2.8 2.7-5 6-5s6 2.2 6 5v2M16 11c2.3 0 4 1.6 4 3.7V18M16 5.5a2.5 2.5 0 0 1 0 5" /></Svg>,
  globe: <Svg><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Svg>,
  lock: <Svg><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></Svg>,
  trend: <Svg><path d="M4 17l6-6 4 4 6-7M15 8h5v5" /></Svg>,
  trophy: <Svg><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 12v5M8 20h8M9 17h6" /></Svg>,
  user: <Svg><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></Svg>,
  circle: <Svg sw={1.9}><circle cx="12" cy="12" r="7" /></Svg>,
}

export default function GroupFiltersModal({ open, onClose, value, onApply }) {
  // Selection locale (Set) initialisee depuis value a chaque ouverture.
  const [sel, setSel] = React.useState(() => new Set(value))
  useEffect(() => { if (open) setSel(new Set(value)) }, [open]) // eslint-disable-line

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const toggle = (opt) => {
    if (opt.disabled) return
    setSel((prev) => {
      const next = new Set(prev)
      next.has(opt.key) ? next.delete(opt.key) : next.add(opt.key)
      return next
    })
  }
  const count = sel.size

  const optBtn = {
    position: 'relative', minHeight: 56, width: '100%', border: '1px solid #292c30',
    borderRadius: 9, background: '#020303', color: '#f3f3f3', display: 'flex',
    alignItems: 'center', textAlign: 'left', padding: '0 46px 0 18px', gap: 16,
    fontSize: 15, fontWeight: 400, letterSpacing: '-0.25px', cursor: 'pointer',
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Group filters"
        style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto',
          border: '1px solid #2a2d31', borderRadius: 15,
          background: 'linear-gradient(180deg,#020303 0%,#010202 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.015), 0 30px 80px rgba(0,0,0,0.55)',
          color: '#f5f5f5', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 22px 0' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 52, height: 52, border: '1px solid #2a2d31', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050607', flex: 'none' }}>
              <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: 'none', stroke: '#f2f2f2', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h4M12 12h8" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /><circle cx="10" cy="12" r="2" />
              </svg>
            </div>
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: 24, lineHeight: 1, fontWeight: 700, letterSpacing: '-1px' }}>Filters</h1>
              <p style={{ margin: 0, color: '#c6c8cb', fontSize: 15, letterSpacing: '-0.4px' }}>Find the perfect groups for you</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" onClick={() => setSel(new Set())}
              style={{ border: 0, background: 'transparent', color: '#f2f2f2', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Clear all</button>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ width: 44, height: 44, border: '1px solid #2a2d31', borderRadius: 11, background: '#030404', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' }}><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, padding: '20px 22px 0' }}>
          {COLS.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {col.map((opt) => {
                const on = sel.has(opt.key)
                return (
                  <button key={opt.key} type="button" onClick={() => toggle(opt)} disabled={opt.disabled}
                    style={{ ...optBtn,
                      borderColor: on ? '#54595f' : '#292c30',
                      background: on ? '#0a0d0e' : '#020303',
                      opacity: opt.disabled ? 0.4 : 1,
                      cursor: opt.disabled ? 'not-allowed' : 'pointer' }}>
                    {ICONS[opt.icon]}
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    <i style={{ position: 'absolute', right: 16, top: '50%', width: 22, height: 22, transform: 'translateY(-50%)', borderRadius: '50%', border: '2px solid ' + (on ? '#f4f4f4' : '#696e75'), background: on ? '#f4f4f4' : 'transparent' }} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px 22px', marginTop: 8, borderTop: '1px solid #282b2f' }}>
          <button type="button" onClick={() => setSel(new Set())}
            style={{ height: 48, minWidth: 160, padding: '0 20px', border: '1px solid #292c30', borderRadius: 9, background: '#020303', color: '#ededed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'none', stroke: '#ececec', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 4v6h6M20 20v-6h-6" /><path d="M5.6 15a8 8 0 0 0 13.1 2.2L20 14M4 10l1.3-3.2A8 8 0 0 1 18.4 9" /></svg>
            <span>Reset filters</span>
          </button>
          <button type="button" onClick={() => { onApply(new Set(sel)); onClose() }}
            style={{ height: 48, width: 260, border: 0, borderRadius: 9, background: '#f4f4f4', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            <span>Apply filters</span>
            <b style={{ width: 30, height: 30, borderRadius: 8, background: '#050505', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500 }}>{count}</b>
          </button>
        </div>
      </div>
    </div>
  )
}
