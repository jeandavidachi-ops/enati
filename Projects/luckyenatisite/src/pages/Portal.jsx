import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../lib/api.js'
import SoundControl from '../components/SoundControl.jsx'

// =====================================================================
//  Page racine : "Versus Guild Portal" + "Versus Registered Arena",
//  design repris A L'IDENTIQUE des modeles new/Versus Guild Portal.html
//  et new/Versus Registered Arena.html, branche sur les APIs reelles :
//  POST /api/versus/register (code -> /home) et
//  GET /api/versus/registered-groups (sieges de l'Arena).
// =====================================================================


// ---------- Geometrie de l'amphitheatre (reprise du modele) ----------
const RE = 104, GAP = 49, ASPECT_X = 1.34
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }
function buildSeats(filled) {
  const r0 = RE + 48
  const seats = []
  let ring = 0
  while (seats.length < filled + 150) {
    const radius = r0 + ring * GAP
    const count = Math.max(10, Math.round((2 * Math.PI * radius) / GAP))
    const aisleAng = (GAP * 0.85) / radius
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      if (Math.abs(angDiff(a, -Math.PI / 2)) < aisleAng || Math.abs(angDiff(a, Math.PI / 2)) < aisleAng) continue
      seats.push({ x: Math.cos(a) * radius * ASPECT_X, y: Math.sin(a) * radius, ring, radius })
    }
    ring++
  }
  return { seats, maxRadius: r0 + (ring - 1) * GAP, outerFilledRadius: seats[filled - 1] ? seats[filled - 1].radius : r0 }
}
function relTime(ts) {
  if (!ts) return null
  const m = Math.floor((Date.now() - ts * 1000) / 60000)
  if (m < 1) return 'just now'
  if (m === 1) return '1 min ago'
  if (m < 60) return m + ' mins ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h === 1 ? '1 hour ago' : h + ' hours ago'
  const d = Math.floor(h / 24)
  return d === 1 ? '1 day ago' : d + ' days ago'
}

// ---------- Arena (SVG amphitheatre : zoom molette, pan drag, hover) ----------
function Arena({ groups }) {
  const filled = groups.length
  const geo = useMemo(() => buildSeats(filled), [filled])
  const ref = useRef(null)
  const dragRef = useRef(null)
  const [view, setView] = useState({ W: 1100, H: 660, zoom: 1, pan: { x: 550, y: 330 }, ready: false })
  const [hovered, setHovered] = useState(null)
  const [dragging, setDragging] = useState(false)

  // Cadrage initial + re-cadrage au resize (memes formules que le modele).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const frame = () => {
      const W = el.clientWidth || 1100, H = el.clientHeight || 660
      const showR = geo.outerFilledRadius + GAP * 2.2
      const zoom = Math.min((Math.min(W, H) / 2 - 40) / showR, 1.6)
      setView({ W, H, zoom, pan: { x: W / 2, y: H / 2 }, ready: true })
    }
    frame()
    window.addEventListener('resize', frame)
    return () => window.removeEventListener('resize', frame)
  }, [geo])

  // Zoom molette centre sur le curseur. Listener natif non-passif pour pouvoir
  // bloquer le scroll de la page pendant le zoom.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 0.893
      setView((v) => {
        const z = Math.min(Math.max(v.zoom * factor, 0.3), 4)
        const r = z / v.zoom
        return { ...v, zoom: z, pan: { x: mx - (mx - v.pan.x) * r, y: my - (my - v.pan.y) * r } }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onDown = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, px: view.pan.x, py: view.pan.y }; setDragging(true) }
  const onMove = (e) => {
    const d = dragRef.current
    if (!d) return
    setView((v) => ({ ...v, pan: { x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) } }))
  }
  const onUp = () => { dragRef.current = null; setDragging(false) }

  const { zoom, pan, W, H, ready } = view
  const sx = (x) => pan.x + x * zoom
  const sy = (y) => pan.y + y * zoom
  const seatR = 19 * zoom

  let svgEls = null, emblem = null, tip = null
  if (ready) {
    const els = []
    // allees verticales en pointilles
    const aOff = GAP * 0.5 * ASPECT_X
    ;[-aOff, aOff].forEach((ox, ai) => {
      els.push(<line key={'at' + ai} x1={sx(ox)} y1={sy(-geo.maxRadius)} x2={sx(ox)} y2={sy(-(RE + 12))} stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="2 7" />)
      els.push(<line key={'ab' + ai} x1={sx(ox)} y1={sy(RE + 12)} x2={sx(ox)} y2={sy(geo.maxRadius)} stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="2 7" />)
    })
    // sol de l'arene (emblème central)
    els.push(<circle key="floor2" cx={sx(0)} cy={sy(0)} r={(RE + 16) * zoom} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)
    els.push(<circle key="floor" cx={sx(0)} cy={sy(0)} r={RE * zoom} fill="#0B0D10" stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" />)
    els.push(<circle key="sheen" cx={sx(0)} cy={sy(0)} r={RE * zoom} fill="url(#emblemSheen)" />)

    for (let i = 0; i < geo.seats.length; i++) {
      const s = geo.seats[i]
      const cx = sx(s.x), cy = sy(s.y)
      const isFilled = i < filled
      if (isFilled) {
        // Siege d'un groupe inscrit : fond blanc (fallback) + photo du groupe par
        // dessus, clippee en cercle. Si la photo est absente/404, le fond blanc reste.
        // FIX hover : un cercle transparent au-dessus sert de hitbox stable (les
        // visuels sont en pointerEvents:none) -> le hover ne clignote pas.
        const g = groups[i]
        const gid = g && g.group_id
        els.push(
          <g key={'s' + i}>
            <clipPath id={'seatClip' + i}><circle cx={cx} cy={cy} r={seatR} /></clipPath>
            <circle cx={cx} cy={cy} r={seatR} fill="url(#seatGrad)" pointerEvents="none" />
            {gid != null && (
              <image href={`/api/group-photo/${gid}`} x={cx - seatR} y={cy - seatR}
                width={seatR * 2} height={seatR * 2} clipPath={`url(#seatClip${i})`}
                preserveAspectRatio="xMidYMid slice" pointerEvents="none" />
            )}
            <circle cx={cx} cy={cy} r={seatR} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" pointerEvents="none" />
            <circle cx={cx} cy={cy} r={seatR} fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          </g>
        )
        if (hovered === i) {
          els.push(<circle key={'h' + i} cx={cx} cy={cy} r={seatR + 2} fill="none" stroke="#ffffff" strokeWidth="1.6" pointerEvents="none" />)
        }
      } else {
        els.push(<circle key={'s' + i} cx={cx} cy={cy} r={seatR} fill="transparent" stroke="rgba(255,255,255,0.20)" strokeWidth="1" />)
      }
    }
    svgEls = els

    emblem = (
      <div style={{ position: 'absolute', left: sx(0), top: sy(0), transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', lineHeight: 1 }}>
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 26 * zoom + 'px', fontWeight: 800, letterSpacing: 8 * zoom + 'px', color: '#ffffff', textTransform: 'uppercase', marginBottom: 12 * zoom + 'px', marginLeft: 8 * zoom + 'px' }}>VERSUS</div>
        <div style={{ fontSize: 60 * zoom + 'px', fontWeight: 700, color: '#ffffff', letterSpacing: -1 * zoom + 'px', fontVariantNumeric: 'tabular-nums' }}>{filled}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5 * zoom + 'px', letterSpacing: 3 * zoom + 'px', color: '#8A909A', textTransform: 'uppercase', marginTop: 10 * zoom + 'px' }}>Registered Groups</div>
        <div style={{ width: 46 * zoom + 'px', height: Math.max(1, zoom) + 'px', background: 'rgba(255,255,255,0.28)', margin: 11 * zoom + 'px auto 0' }} />
      </div>
    )

    if (hovered != null && hovered < filled && geo.seats[hovered]) {
      const s = geo.seats[hovered]
      const g = groups[hovered]
      const when = relTime(g && g.added_at)
      tip = (
        <div style={{ position: 'absolute', left: sx(s.x) + seatR + 14, top: sy(s.y), transform: 'translateY(-50%)', background: '#0B0D10', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, padding: '9px 12px', pointerEvents: 'none', zIndex: 5, boxShadow: '0 8px 26px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
          <div style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 600 }}>{(g && g.group_name) || 'Unknown'}</div>
          <div style={{ color: '#8A909A', fontSize: 12, marginTop: 2 }}>{when ? 'Registered ' + when : 'Registered'}</div>
        </div>
      )
    }
  }

  return (
    <div ref={ref}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
      style={{ position: 'relative', width: '100%', height: 660, overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', background: '#090B0E' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <defs>
          <radialGradient id="seatGrad" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="62%" stopColor="#ECEDEF" />
            <stop offset="100%" stopColor="#C2C5CB" />
          </radialGradient>
          <linearGradient id="emblemSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {svgEls}
      </svg>
      {emblem}
      {tip}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.05), transparent 42%), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
    </div>
  )
}

// ---------- Quest tracker (4 etapes, icones du modele) ----------
const STEPS = [
  {
    n: '01', title: 'Register the Bot', desc: 'Add @versusrankbot as an administrator in your Telegram group.',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>,
  },
  {
    n: '02', title: 'Enter Access Code', desc: 'Enter the invitation code you received from another registered group.',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  },
  {
    n: '03', title: 'Register Group', desc: 'Your group will be added to the Versus waitlist.',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    n: '04', title: 'Claim Referral Code', desc: 'A unique one-time referral code will be created for your group.',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>,
  },
]

export default function Portal() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const groupsRes = useApi('/api/versus/registered-groups')
  const groups = (groupsRes && groupsRes.success ? groupsRes.data : []) || []

  // Username reel du bot (via /api/auth/config) pour le bouton "Add Telegram Bot".
  const cfg = useApi('/api/auth/config')
  const botUsername = (cfg && cfg.telegram && cfg.telegram.bot_username) || 'versusrankbot'

  const register = async () => {
    const value = code.trim()
    if (!value || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/versus/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      })
      const data = await r.json()
      if (data && data.success && data.redirect) {
        navigate(data.redirect)
        return
      }
      setError(data && data.error === 'invalid_code' ? 'INVALID INVITATION CODE' : 'SOMETHING WENT WRONG — TRY AGAIN')
    } catch {
      setError('NETWORK ERROR — TRY AGAIN')
    }
    setBusy(false)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: '#050607', fontFamily: "'Manrope', -apple-system, system-ui, sans-serif" }}>
      <style>{portalCss}</style>

      {/* Background : grille + halos */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '52px 52px', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000, transparent 78%)', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000, transparent 78%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 45% at 50% 6%, rgba(255,255,255,0.07), transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 55%, transparent 55%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />

      {/* Particules montantes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '12%', bottom: '20%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'vs-float 9s linear infinite', animationDelay: '0s' }} />
        <div style={{ position: 'absolute', left: '22%', bottom: '10%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 11s linear infinite', animationDelay: '1.5s' }} />
        <div style={{ position: 'absolute', left: '34%', bottom: '30%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 8s linear infinite', animationDelay: '3s' }} />
        <div style={{ position: 'absolute', left: '48%', bottom: '15%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', animation: 'vs-float 12s linear infinite', animationDelay: '0.8s' }} />
        <div style={{ position: 'absolute', left: '62%', bottom: '25%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 10s linear infinite', animationDelay: '2.2s' }} />
        <div style={{ position: 'absolute', left: '74%', bottom: '12%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 9.5s linear infinite', animationDelay: '4s' }} />
        <div style={{ position: 'absolute', left: '86%', bottom: '28%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', animation: 'vs-float 13s linear infinite', animationDelay: '1s' }} />
        <div style={{ position: 'absolute', left: '55%', bottom: '8%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', animation: 'vs-float 11.5s linear infinite', animationDelay: '5s' }} />
      </div>

      {/* Contenu */}
      <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 56px' }}>

        {/* Wordmark VERSUS (style header /home) : colle a gauche de la page, non cliquable */}
        <span style={{ position: 'absolute', top: 26, left: 28, zIndex: 3, fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'italic', fontWeight: 600, fontSize: 24, letterSpacing: '0.15em', color: '#d4d4d8', userSelect: 'none', pointerEvents: 'none' }}>VERSUS</span>

        {/* HUD header : badge Wait List a droite */}
        <div style={{ width: '100%', maxWidth: 680, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, background: 'rgba(255,255,255,0.02)', animation: 'vs-badge 3s ease-in-out infinite' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#C7CCD4', textTransform: 'uppercase' }}>Wait List</span>
          </div>
        </div>

        {/* Emblème animé (VS noir — a l'identique du modele new/guild noir.html) */}
        <div style={{ position: 'relative', width: 150, height: 150, marginBottom: 22 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 220, height: 220, transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 62%)', animation: 'vs-pulse 3.4s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: -6, border: '1px dashed rgba(255,255,255,0.28)', borderRadius: '50%', animation: 'vs-spin 14s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 14, border: '1px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%', animation: 'vs-spin-rev 8s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 26, background: '#0B0D10', border: '1px solid rgba(255,255,255,0.20)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/images/vs-noir.png" alt="Versus" style={{ width: '62%', height: '62%', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>

        {/* Panneau */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 680, background: 'linear-gradient(180deg, rgba(13,15,19,0.9), rgba(9,11,14,0.9))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 4, boxShadow: '0 0 60px rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.5)', padding: 44, overflow: 'hidden' }}>

          {/* Brackets HUD */}
          <div style={{ position: 'absolute', top: 10, left: 10, width: 20, height: 20, borderTop: '2px solid rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.5)', animation: 'vs-corner 3s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderTop: '2px solid rgba(255,255,255,0.5)', borderRight: '2px solid rgba(255,255,255,0.5)', animation: 'vs-corner 3s ease-in-out infinite', animationDelay: '.75s', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 10, width: 20, height: 20, borderBottom: '2px solid rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.5)', animation: 'vs-corner 3s ease-in-out infinite', animationDelay: '1.5s', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderBottom: '2px solid rgba(255,255,255,0.5)', borderRight: '2px solid rgba(255,255,255,0.5)', animation: 'vs-corner 3s ease-in-out infinite', animationDelay: '2.25s', pointerEvents: 'none' }} />
          {/* Scan line */}
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'vs-scan 6s ease-in-out infinite', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: '#6E7681', textTransform: 'uppercase', marginBottom: 12 }}>// REGISTER</div>
            <h1 style={{ margin: '0 0 12px', fontSize: 40, fontWeight: 800, color: '#ffffff', letterSpacing: '-1.2px', lineHeight: 1.05 }}>Register Your Group</h1>
            <p style={{ margin: '0 0 30px', fontSize: 17, lineHeight: 1.55, color: '#A8ADB5' }}>Add the Versus Telegram bot to your group, enter your invitation code and claim your unique referral code.</p>

            {/* Quest tracker */}
            <div style={{ position: 'relative', marginBottom: 30 }}>
              <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5))', backgroundSize: '100% 24px', backgroundRepeat: 'repeat-y', opacity: 0.35, animation: 'vs-energy 1.2s linear infinite' }} />
              {STEPS.map((s, i) => (
                <div key={s.n} style={{ position: 'relative', display: 'flex', gap: 16, marginBottom: i < STEPS.length - 1 ? 18 : 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.14)', background: '#0B0D10', color: '#ffffff', zIndex: 1 }}>
                    {s.icon}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#6E7681' }}>{s.n}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>{s.title}</span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: '#7A808A', marginTop: 3 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton principal avec shine */}
            <button className="vs-addbot" onClick={() => window.open(`https://t.me/${botUsername}?startgroup=true`, '_blank')}
              style={{ position: 'relative', width: '100%', height: 56, border: 'none', borderRadius: 10, background: '#ffffff', color: '#050607', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase', overflow: 'hidden' }}>
              <span style={{ position: 'relative', zIndex: 1 }}>Add Telegram Bot</span>
              <span style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', animation: 'vs-shine 3.5s ease-in-out infinite', pointerEvents: 'none' }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '22px 0 18px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, color: '#5A606B', textTransform: 'uppercase' }}>Already added the bot?</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <input className="vs-code-input" value={code}
                onChange={(e) => { setCode(e.target.value); if (error) setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') register() }}
                placeholder="INVITATION CODE"
                style={{ flex: 1, height: 56, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', background: '#070809', color: '#ffffff', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, outline: 'none', letterSpacing: 2 }} />
              <button className="vs-register" onClick={register} disabled={busy}
                style={{ height: 56, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: '#14171B', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.5px', textTransform: 'uppercase', opacity: busy ? 0.6 : 1 }}>
                {busy ? '...' : 'Register'}
              </button>
            </div>
            {error && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#f87171', textTransform: 'uppercase', marginTop: 12 }}>// {error}</div>
            )}
          </div>
        </div>

        {/* ===== Versus Registered Arena (juste en dessous) ===== */}
        <div style={{ width: '100%', maxWidth: 1160, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', margin: '56px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#C7CCD4', textTransform: 'uppercase' }}>The Arena</span>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 1160, background: '#0B0D10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '26px 30px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.4px' }}>Registered Groups</h1>
            <p style={{ margin: 0, fontSize: 14.5, color: '#8A909A' }}>Every registered Telegram group earns a permanent seat inside the Versus Arena.</p>
          </div>

          <Arena groups={groups} />

          <div style={{ padding: '16px 30px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, color: '#6E7681' }}>{groups.length} Registered Groups</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#4A505A', letterSpacing: 1 }}>SCROLL TO ZOOM&nbsp;·&nbsp;DRAG TO PAN</span>
          </div>
        </div>

      </div>

      {/* Bouton de son (bas-droite) : mute/unmute + volume */}
      <SoundControl />
    </div>
  )
}

// Keyframes + micro-interactions du modele. Scrollbar : heritee de global.css.
const portalCss = `
  @keyframes vs-spin { to { transform: rotate(360deg); } }
  @keyframes vs-spin-rev { to { transform: rotate(-360deg); } }
  @keyframes vs-pulse { 0%,100% { opacity: 0.45; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.85; transform: translate(-50%,-50%) scale(1.15); } }
  @keyframes vs-shine { 0% { transform: translateX(-140%) skewX(-20deg); } 55%,100% { transform: translateX(320%) skewX(-20deg); } }
  @keyframes vs-energy { to { background-position: 0 -240px; } }
  @keyframes vs-float { 0% { transform: translateY(20px); opacity: 0; } 12% { opacity: 0.7; } 88% { opacity: 0.5; } 100% { transform: translateY(-220px); opacity: 0; } }
  @keyframes vs-scan { 0% { top: -8%; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { top: 108%; opacity: 0; } }
  @keyframes vs-corner { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes vs-badge { 0%,100% { box-shadow: 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 14px rgba(255,255,255,0.25); } }
  .vs-addbot:hover { background: #E8E9EB !important; }
  .vs-register:hover { background: #1B1F24 !important; }
  .vs-code-input::placeholder { color: #5A606B; }
  .vs-code-input:focus { border-color: rgba(255,255,255,0.30) !important; }
`
