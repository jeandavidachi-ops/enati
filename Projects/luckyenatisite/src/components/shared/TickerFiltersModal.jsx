import React, { useEffect } from 'react'

// Boxe de filtres TICKERS — port fidele de new/popular_tickers_filter_exact,
// affichee en modal overlay centre (au lieu du plein ecran 1580x970 de la maquette).
// 3 colonnes : SCAN (tri), MARKET CAP (tranche min/max), AGE (tri). Le tri est
// mono-selection (radio) ; la tranche market cap est un filtre independant.
// value/onApply : { sort, minCap, maxCap }.

const Svg = ({ sw = 1.75, children }) => (
  <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, flex: '0 0 22px', fill: 'none', stroke: '#f5f5f5', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
    {children}
  </svg>
)
const ICONS = {
  scanned: <Svg><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20v-2.3c0-2.6 2.7-4.7 6-4.7s6 2.1 6 4.7V20M15.5 14c3 .2 5.5 1.9 5.5 4V20" /></Svg>,
  clock: <Svg><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></Svg>,
  calNew: <Svg><rect x="5" y="5" width="14" height="15" rx="2" /><path d="M8 3v4M16 3v4M5 9h14" /></Svg>,
  calOld: <Svg><rect x="5" y="5" width="14" height="15" rx="2" /><path d="M8 3v4M16 3v4M5 9h14M9 13h.01M12 13h.01M15 13h.01M9 16h.01M12 16h.01M15 16h.01" /></Svg>,
}

// SCAN + AGE : options de tri (cles = tickerComparator).
const SORTS = {
  scan: [
    { key: 'most-scanned', title: 'Most Scanned', sub: 'Tokens scanned by the most groups', icon: 'scanned' },
    { key: 'latest-scan', title: 'Latest Scan', sub: 'Most recently scanned tokens', icon: 'clock' },
  ],
  age: [
    { key: 'newest', title: 'Newest', sub: 'Recently created tokens', icon: 'calNew' },
    { key: 'oldest', title: 'Oldest', sub: 'Longest existing tokens', icon: 'calOld' },
  ],
}

// "1.5M", "100k", "2 000 000" -> nombre. null si vide/invalide.
function parseAmount(s) {
  if (s == null) return null
  let str = String(s).trim().toLowerCase().replace(/[\s,$]/g, '')
  if (!str) return null
  let mult = 1
  const suf = str.slice(-1)
  if (suf === 'k') { mult = 1e3; str = str.slice(0, -1) }
  else if (suf === 'm') { mult = 1e6; str = str.slice(0, -1) }
  else if (suf === 'b') { mult = 1e9; str = str.slice(0, -1) }
  const n = parseFloat(str)
  return isNaN(n) ? null : n * mult
}

const Radio = ({ on, style }) => (
  <i style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: '50%', border: '2px solid ' + (on ? '#f4f4f4' : '#696e75'), background: on ? '#f4f4f4' : 'transparent', ...style }} />
)

export default function TickerFiltersModal({ open, onClose, value, onApply }) {
  const [sort, setSort] = React.useState(value?.sort || null)
  const [minStr, setMinStr] = React.useState(value?.minCap != null ? String(value.minCap) : '')
  const [maxStr, setMaxStr] = React.useState(value?.maxCap != null ? String(value.maxCap) : '')
  const [capOn, setCapOn] = React.useState(value?.minCap != null || value?.maxCap != null)

  useEffect(() => {
    if (!open) return
    setSort(value?.sort || null)
    setMinStr(value?.minCap != null ? String(value.minCap) : '')
    setMaxStr(value?.maxCap != null ? String(value.maxCap) : '')
    setCapOn(value?.minCap != null || value?.maxCap != null)
  }, [open]) // eslint-disable-line

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const minN = capOn ? parseAmount(minStr) : null
  const maxN = capOn ? parseAmount(maxStr) : null
  const capActive = capOn && (minN != null || maxN != null)
  const count = (sort ? 1 : 0) + (capActive ? 1 : 0)

  const reset = () => { setSort(null); setCapOn(false); setMinStr(''); setMaxStr('') }
  const apply = () => {
    onApply({ sort, minCap: capActive ? minN : null, maxCap: capActive ? maxN : null })
    onClose()
  }
  const toggleSort = (key) => setSort((prev) => (prev === key ? null : key))

  const optBtn = {
    position: 'relative', width: '100%', border: 0, borderBottom: '1px solid #33383d',
    background: 'transparent', color: '#f3f3f3', display: 'flex', alignItems: 'flex-start',
    textAlign: 'left', padding: '18px 44px 18px 18px', gap: 16, cursor: 'pointer',
  }
  const colTitle = { margin: '0 0 12px 2px', fontSize: 13, fontWeight: 700, letterSpacing: '0.4px', color: '#f1f1f1' }
  const stackWrap = { border: '1px solid #3a4045', borderRadius: 11, overflow: 'hidden', background: 'rgba(5,8,10,.72)' }
  const fieldLabel = { display: 'block', margin: '0 0 8px', fontSize: 13, color: '#f0f0f0' }
  const inputShell = { height: 44, border: '1px solid #454b50', borderRadius: 9, display: 'flex', alignItems: 'center', padding: '0 14px', marginBottom: 16, background: 'rgba(8,11,13,.72)' }
  const inputCss = { flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: '#fff', fontSize: 14 }

  const Option = ({ opt }) => {
    const on = sort === opt.key
    return (
      <button type="button" onClick={() => toggleSort(opt.key)}
        style={{ ...optBtn, background: on ? '#0a0d0e' : 'transparent' }}
        onMouseDown={(e) => e.preventDefault()}>
        <span style={{ marginTop: 1 }}>{ICONS[opt.icon]}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
          <strong style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.3px' }}>{opt.title}</strong>
          <span style={{ fontSize: 12.5, lineHeight: 1.35, color: '#c9cacd' }}>{opt.sub}</span>
        </span>
        <Radio on={on} style={{ position: 'absolute', right: 16, top: 20 }} />
      </button>
    )
  }
  const Stack = ({ opts }) => (
    <div style={stackWrap}>
      {opts.map((o, i) => (
        <div key={o.key} style={i === opts.length - 1 ? { } : {}}>
          <Option opt={o} />
        </div>
      ))}
    </div>
  )

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ticker filters"
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
                <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h5M13 12h7" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /><circle cx="11" cy="12" r="2" />
              </svg>
            </div>
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: 24, lineHeight: 1, fontWeight: 700, letterSpacing: '-1px' }}>Filters</h1>
              <p style={{ margin: 0, color: '#c6c8cb', fontSize: 15, letterSpacing: '-0.4px' }}>Find the perfect tickers for you</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" onClick={reset}
              style={{ border: 0, background: 'transparent', color: '#f2f2f2', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Clear all</button>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ width: 44, height: 44, border: '1px solid #2a2d31', borderRadius: 11, background: '#030404', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' }}><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        {/* Grid : SCAN | MARKET CAP | AGE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, padding: '20px 22px 0' }}>
          <div>
            <h2 style={colTitle}>SCAN</h2>
            <Stack opts={SORTS.scan} />
          </div>

          <div>
            <h2 style={colTitle}>MARKET CAP</h2>
            <div style={{ border: '1px solid #3a4045', borderRadius: 11, background: 'rgba(5,8,10,.72)', padding: '18px 16px 6px' }}>
              <button type="button" onClick={() => setCapOn((v) => !v)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18, background: 'transparent', border: 0, color: '#f3f3f3', textAlign: 'left', cursor: 'pointer', padding: 0, width: '100%' }}>
                <Radio on={capActive} style={{ marginTop: 1 }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <strong style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.3px' }}>Market Cap</strong>
                  <span style={{ fontSize: 12.5, lineHeight: 1.35, color: '#c9cacd' }}>Choose your own market cap range</span>
                </span>
              </button>
              <label style={fieldLabel} htmlFor="tf-min">Min Market Cap</label>
              <div style={inputShell}>
                <input id="tf-min" type="text" placeholder="Min amount" value={minStr}
                  onFocus={() => setCapOn(true)} onChange={(e) => setMinStr(e.target.value)} style={inputCss} />
                <span style={{ fontSize: 14, color: '#fff' }}>USD</span>
              </div>
              <label style={fieldLabel} htmlFor="tf-max">Max Market Cap</label>
              <div style={inputShell}>
                <input id="tf-max" type="text" placeholder="Max amount" value={maxStr}
                  onFocus={() => setCapOn(true)} onChange={(e) => setMaxStr(e.target.value)} style={inputCss} />
                <span style={{ fontSize: 14, color: '#fff' }}>USD</span>
              </div>
            </div>
          </div>

          <div>
            <h2 style={colTitle}>AGE</h2>
            <Stack opts={SORTS.age} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px 22px', marginTop: 8, borderTop: '1px solid #282b2f' }}>
          <button type="button" onClick={reset}
            style={{ height: 48, minWidth: 160, padding: '0 20px', border: '1px solid #292c30', borderRadius: 9, background: '#020303', color: '#ededed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'none', stroke: '#ececec', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 4v6h6M20 20v-6h-6" /><path d="M5.6 15a8 8 0 0 0 13.1 2.2L20 14M4 10l1.3-3.2A8 8 0 0 1 18.4 9" /></svg>
            <span>Reset filters</span>
          </button>
          <button type="button" onClick={apply}
            style={{ height: 48, width: 260, border: 0, borderRadius: 9, background: '#f4f4f4', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            <span>Apply filters</span>
            <b style={{ width: 30, height: 30, borderRadius: 8, background: '#050505', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500 }}>{count}</b>
          </button>
        </div>
      </div>
    </div>
  )
}
