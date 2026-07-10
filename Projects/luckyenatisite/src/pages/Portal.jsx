import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useGlobalZoom from '../hooks/useGlobalZoom.js'
import { useApi } from '../lib/api.js'

// Avatar de secours pour le tooltip d'un point (photo du groupe ou logo Versus).
function DotAvatar({ src }) {
  const [err, setErr] = useState(false)
  const style = { width: 34, height: 34, borderRadius: 8, objectFit: 'cover', background: '#0d0d0d' }
  if (src && !err) return <img src={src} onError={() => setErr(true)} style={style} />
  return <img src="/images/versus.png" alt="" style={style} />
}

// Un point blanc = un groupe enregistre. Tooltip purement CSS (:hover) en
// pointer-events:none, decale au-dessus d'une hitbox stable : le curseur ne quitte
// jamais le point -> le hover ne clignote pas en boucle.
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
    <div className="portal-root">
      <style>{portalCss}</style>

      {/* ===== Versus Guild Portal (carte, design identique aux modeles new/) ===== */}
      <div className="portal-card">
        <div style={{ textAlign: 'center' }}>
          <div className="chrome portal-logo">VERSUS</div>
          <h1 className="portal-h1">Versus Guild Portal</h1>
          <p className="portal-sub">
            Add the Versus bot as an admin of your Telegram group and you'll instantly
            receive an invitation code in your chat. Enter it below to register your guild.
          </p>
        </div>

        <form onSubmit={submit} style={{ marginTop: 28 }}>
          <label className="portal-label">Invitation code</label>
          <input
            className="field"
            value={code}
            onChange={(e) => { setCode(e.target.value); if (error) setError('') }}
            placeholder="Paste your code"
            autoComplete="off"
          />
          {error && <p className="portal-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 18 }}>
            {busy ? 'Checking…' : <>Register <span style={{ fontFamily: 'JetBrains Mono' }}>&rarr;</span></>}
          </button>
        </form>

        <div className="portal-foot">
          Already registered? <a className="portal-link" onClick={() => navigate('/home')}>Enter the arena</a>
        </div>
      </div>

      {/* ===== Versus Registered Arena ===== */}
      <section className="arena">
        <div className="arena-head">
          <h2 className="arena-title">Versus Registered Arena</h2>
          <span className="arena-count">{groups.length} registered</span>
        </div>
        <p className="arena-sub">Each dot is a guild that joined the arena.</p>
        <div className="arena-grid">
          {groups.map((g) => <ArenaDot key={g.group_id} group={g} />)}
          {groups.length === 0 && <p className="arena-empty">No registered guilds yet.</p>}
        </div>
      </section>
    </div>
  )
}

// Styles repris a l'identique des modeles du dossier new/ (Versus Login Modal, etc.).
// Scrollbar : aucune surcharge -> heritee de global.css (scrollbar du site).
const portalCss = `
  @keyframes vs-chrome { from{background-position:50% 8%} to{background-position:50% 92%} }
  @keyframes vs-in { from{opacity:0; transform:translateY(14px) scale(.97)} to{opacity:1; transform:translateY(0) scale(1)} }

  .portal-root{
    min-height:100vh; background:#050507; color:#f2f2f4;
    font-family:'Inter',system-ui,sans-serif;
    display:flex; flex-direction:column; align-items:center;
    padding:64px 24px 80px; gap:56px;
  }

  .chrome{ color:transparent; -webkit-background-clip:text; background-clip:text;
    background-image:linear-gradient(180deg,#ffffff,#e6ebf1 28%,#8b96a4 49%,#5b6570 51%,#b3bcc7 55%,#f4f7fa 74%,#ffffff);
    background-size:100% 240%; }

  .portal-card{
    width:480px; max-width:100%; border-radius:26px; padding:44px 44px 34px; position:relative;
    animation:vs-in .4s cubic-bezier(.2,.8,.3,1) both;
    background:radial-gradient(130% 120% at 50% 0%,#16171d 0%,#0c0d11 60%,#0a0b0e 100%);
    border:1px solid rgba(255,255,255,.1);
    box-shadow:0 40px 100px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.06);
  }
  .portal-logo{ font-family:'Kanit',sans-serif; font-weight:900; font-style:italic; font-size:44px;
    letter-spacing:-0.03em; animation:vs-chrome 4s ease-in-out infinite alternate; line-height:1; }
  .portal-h1{ font-family:'Archivo Black',sans-serif; font-size:24px; color:#f6f6f8; margin:18px 0 0; letter-spacing:-0.01em; }
  .portal-sub{ color:#8a8d94; font-size:15px; line-height:1.55; margin:11px auto 0; max-width:380px; }

  .portal-label{ display:block; font-size:13px; font-weight:600; color:#b6b9c0; margin-bottom:7px; }
  .field{ width:100%; padding:15px 17px; border-radius:13px; background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.13); color:#fff; font-size:15px; font-weight:500; outline:none;
    font-family:'Inter',sans-serif; transition:border-color .15s, background .15s; }
  .field::placeholder{ color:rgba(255,255,255,.4); }
  .field:focus{ border-color:rgba(255,255,255,.5); background:rgba(255,255,255,.08); }

  .btn-primary{ width:100%; padding:16px; border-radius:13px; border:none; font-size:16px; font-weight:700; cursor:pointer;
    background:#f4f4f5; color:#0a0a0c; font-family:'Inter',sans-serif; transition:transform .12s, box-shadow .2s;
    display:flex; align-items:center; justify-content:center; gap:8px; }
  .btn-primary:hover{ transform:translateY(-1px); box-shadow:0 12px 28px -10px rgba(255,255,255,.5); }
  .btn-primary:disabled{ opacity:.6; cursor:default; transform:none; box-shadow:none; }

  .portal-error{ color:#f87171; font-size:13px; margin:11px 0 0; }
  .portal-foot{ text-align:center; margin-top:24px; padding-top:20px; border-top:1px solid rgba(255,255,255,.08);
    font-size:14px; color:#8a8d94; }
  .portal-link{ color:#fff; font-weight:600; text-decoration:none; cursor:pointer; }
  .portal-link:hover{ text-decoration:underline; }

  /* ---- Registered Arena ---- */
  .arena{ width:480px; max-width:100%; }
  .arena-head{ display:flex; align-items:baseline; gap:12px; }
  .arena-title{ font-family:'Archivo Black',sans-serif; font-size:19px; color:#f6f6f8; margin:0; letter-spacing:-0.01em; }
  .arena-count{ font-size:13px; color:#8a8d94; }
  .arena-sub{ font-size:14px; color:#8a8d94; margin:8px 0 0; }
  .arena-empty{ font-size:14px; color:rgba(255,255,255,.35); margin:0; }
  .arena-grid{ display:flex; flex-wrap:wrap; gap:22px; align-items:center; margin-top:22px; }

  .arena-dot{ position:relative; display:inline-flex; width:14px; height:14px; align-items:center; justify-content:center; outline:none; }
  .arena-dot-hit{ width:14px; height:14px; border-radius:50%; background:#f4f4f5;
    box-shadow:0 0 8px rgba(255,255,255,.25); transition:transform .18s ease, box-shadow .18s ease; }
  .arena-dot:hover .arena-dot-hit, .arena-dot:focus-visible .arena-dot-hit{
    transform:scale(1.25); box-shadow:0 0 16px rgba(255,255,255,.55); }
  .arena-tip{ position:absolute; bottom:calc(100% + 12px); left:50%; transform:translateX(-50%) translateY(4px);
    display:flex; align-items:center; gap:10px; white-space:nowrap; padding:8px 12px 8px 8px; border-radius:12px;
    background:#141519; border:1px solid rgba(255,255,255,.1); box-shadow:0 20px 40px -20px rgba(0,0,0,.9);
    opacity:0; pointer-events:none; transition:opacity .16s ease, transform .16s ease; z-index:20; }
  .arena-dot:hover .arena-tip, .arena-dot:focus-visible .arena-tip{ opacity:1; transform:translateX(-50%) translateY(0); }
  .arena-tip-name{ font-size:13px; color:#e6e8ea; font-weight:600; }
`
