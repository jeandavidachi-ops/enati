import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCorner from '../components/AuthCorner.jsx'
import VsSearch from '../components/VsSearch.jsx'
import useGlobalZoom from '../hooks/useGlobalZoom.js'
import { useApi } from '../lib/api.js'

// Avatar de secours pour le tooltip d'un point (photo du groupe ou logo Versus).
function DotAvatar({ src }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return <img src={src} onError={() => setErr(true)}
      style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', background: '#0d0d0d' }} />
  }
  return <img src="/images/versus.png" alt=""
    style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', background: '#0d0d0d' }} />
}

// Un point blanc = un groupe enregistre. Le tooltip est purement CSS (:hover) et en
// pointer-events:none, decale au-dessus du point : le curseur ne quitte jamais le
// point, donc le hover ne clignote pas en boucle (contrairement a onMouseEnter/Leave).
function ArenaDot({ group }) {
  const photo = group.group_id != null ? '/api/group-photo/' + group.group_id : null
  return (
    <span className="arena-dot" tabIndex={0}>
      <span className="arena-dot-hit" />
      <span className="arena-tip" role="tooltip">
        <DotAvatar src={photo} />
        <span className="arena-tip-name">{group.group_name || 'Unknown'}</span>
      </span>
    </span>
  )
}

export default function Portal() {
  useGlobalZoom()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const res = useApi('/api/versus/registered-groups')
  const groups = (res && res.success ? res.data : []) || []

  const submit = async (e) => {
    e.preventDefault()
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
      setError(data && data.error === 'invalid_code'
        ? 'Invalid invitation code.'
        : 'Something went wrong. Please try again.')
    } catch {
      setError('Network error. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0c] font-mono text-white">
      <style>{portalCss}</style>

      <header className="pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-5">
        <div className="w-full flex items-center gap-6">
          <Link to="/home" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            className="text-2xl font-semibold tracking-[0.15em] italic select-none text-zinc-300 cursor-pointer hover:text-white transition-colors">VERSUS</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link className="hover:text-white" to="/home">Home</Link>
            <Link className="hover:text-white" to="/ticker">Tickers</Link>
            <Link className="hover:text-white" to="/group">Groups</Link>
            <Link className="hover:text-white" to="/leaderboard">Leaderboard</Link>
          </nav>
          <div className="flex-1 max-w-xl mx-auto hidden sm:block">
            <VsSearch />
          </div>
          <AuthCorner />
        </div>
      </header>

      <main className="flex-1 pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-10">
        {/* ---- Versus Guild Portal ---- */}
        <section id="guild-portal" className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Versus Guild Portal</h1>
          <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
            Add the Versus bot as an <span className="text-zinc-300">admin</span> of your Telegram group.
            You'll instantly receive an <span className="text-zinc-300">invitation code</span> in your chat.
            Enter it below to register your guild and unlock your dashboard.
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); if (error) setError('') }}
              placeholder="Invitation code"
              autoComplete="off"
              className="flex-1 rounded-xl bg-zinc-900 ring-1 ring-white/10 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:ring-white/25 transition"
            />
            <button type="submit" disabled={busy}
              className="rounded-xl bg-[#f5f5f5] text-black font-semibold px-6 py-3 text-sm whitespace-nowrap hover:bg-white transition-colors disabled:opacity-60">
              {busy ? 'Checking…' : 'Register'}
            </button>
          </form>
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </section>

        {/* ---- Versus Registered Arena ---- */}
        <section id="registered-arena" className="mt-16">
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-semibold">Versus Registered Arena</h2>
            <span className="text-sm text-zinc-500">{groups.length} registered</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Each dot is a guild that joined the arena.</p>

          <div className="arena-grid mt-8">
            {groups.map((g) => (
              <ArenaDot key={g.group_id} group={g} />
            ))}
            {groups.length === 0 && (
              <p className="text-sm text-zinc-600">No registered guilds yet.</p>
            )}
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8">
        <p className="text-xs text-zinc-600">© 2026 Versus. All rights reserved.</p>
      </footer>
    </div>
  )
}

// Scrollbar : aucune surcharge -> la page herite de global.css (scrollbar du site).
const portalCss = `
  #registered-arena .arena-grid{
    display:flex; flex-wrap:wrap; gap:22px; align-items:center;
  }
  .arena-dot{
    position:relative; display:inline-flex; width:14px; height:14px;
    align-items:center; justify-content:center; outline:none;
  }
  /* Zone survolable stable (le point). Le hover reste sur CET element -> pas de boucle. */
  .arena-dot-hit{
    width:14px; height:14px; border-radius:50%;
    background:#f4f4f5; box-shadow:0 0 8px rgba(255,255,255,.25);
    transition:transform .18s ease, box-shadow .18s ease;
  }
  .arena-dot:hover .arena-dot-hit,
  .arena-dot:focus-visible .arena-dot-hit{
    transform:scale(1.25); box-shadow:0 0 16px rgba(255,255,255,.55);
  }
  /* Tooltip au-dessus du point, non interactif : ne vole jamais le hover. */
  .arena-tip{
    position:absolute; bottom:calc(100% + 12px); left:50%; transform:translateX(-50%) translateY(4px);
    display:flex; align-items:center; gap:10px; white-space:nowrap;
    padding:8px 12px 8px 8px; border-radius:12px;
    background:#141519; border:1px solid rgba(255,255,255,.1);
    box-shadow:0 20px 40px -20px rgba(0,0,0,.9);
    opacity:0; pointer-events:none; transition:opacity .16s ease, transform .16s ease;
    z-index:20;
  }
  .arena-dot:hover .arena-tip,
  .arena-dot:focus-visible .arena-tip{
    opacity:1; transform:translateX(-50%) translateY(0);
  }
  .arena-tip-name{ font-size:13px; color:#e6e8ea; font-weight:600; }
`
