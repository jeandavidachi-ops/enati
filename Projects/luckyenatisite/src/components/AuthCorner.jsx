/* Coin auth partagé du header (porté depuis public/js/versus-auth.js).
   Boutons Sign In/Up -> Connect Telegram -> carte de rang, + modales via portal. */
import React, { useState as vsUseState, useEffect as vsUseEffect, useRef as vsUseRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate as vsUseNavigate } from 'react-router-dom'
import { apiFetch, apiGet, apiSet } from '../lib/api.js'

;(function injectAuthStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('vs-auth-styles')) return
  var css = `
  @keyframes vs-chrome { from{background-position:50% 8%} to{background-position:50% 92%} }
  @keyframes vs-in { from{opacity:0; transform:translateY(14px) scale(.97)} to{opacity:1; transform:translateY(0) scale(1)} }
  @keyframes vs-scrim-in { from{opacity:0} to{opacity:1} }
  .vs-scrim{position:fixed;inset:0;z-index:100;background:rgba(4,4,7,.62);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;padding:24px;
    font-family:'Inter',system-ui,sans-serif;animation:vs-scrim-in .2s ease both;overflow-y:auto}
  .vs-modal{width:440px;max-width:100%;border-radius:26px;padding:40px 40px 30px;position:relative;margin:auto;
    animation:vs-in .4s cubic-bezier(.2,.8,.3,1) both;
    background:radial-gradient(130% 120% at 50% 0%,#16171d 0%,#0c0d11 60%,#0a0b0e 100%);
    border:1px solid rgba(255,255,255,.1);
    box-shadow:0 40px 100px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.06)}
  .vs-close{position:absolute;top:20px;right:20px;width:34px;height:34px;border-radius:10px;border:none;cursor:pointer;
    background:rgba(255,255,255,.06);color:#9a9da3;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
  .vs-close:hover{background:rgba(255,255,255,.12);color:#fff}
  .vs-chrome{color:transparent;-webkit-background-clip:text;background-clip:text;
    background-image:linear-gradient(180deg,#ffffff,#e6ebf1 28%,#8b96a4 49%,#5b6570 51%,#b3bcc7 55%,#f4f7fa 74%,#ffffff);
    background-size:100% 240%;
    font-family:'Kanit','Archivo Black',sans-serif;font-weight:900;font-style:italic;font-size:44px;letter-spacing:-0.03em;
    animation:vs-chrome 4s ease-in-out infinite alternate}
  .vs-h1{font-family:'Archivo Black','Inter',sans-serif;font-size:24px;color:#f6f6f8;margin:18px 0 0;letter-spacing:-0.01em}
  .vs-sub{color:#8a8d94;font-size:15px;margin:9px 0 0}
  .vs-auth-btn{padding:14px 18px;border-radius:13px;font-size:14px;font-weight:600;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:9px;font-family:'Inter',sans-serif;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:#f2f2f4;
    transition:background .15s,border-color .15s,transform .12s}
  .vs-auth-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3);transform:translateY(-1px)}
  .vs-auth-btn svg{width:19px;height:19px;flex:none}
  .vs-auth-btn .lbl{flex:1;text-align:center}
  .vs-field{width:100%;padding:15px 17px;border-radius:13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.13);
    color:#fff;font-size:15px;font-weight:500;outline:none;font-family:'Inter',sans-serif;transition:border-color .15s,background .15s}
  .vs-field::placeholder{color:rgba(255,255,255,.4)}
  .vs-field:focus{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.08)}
  .vs-label{display:block;font-size:13px;font-weight:600;color:#b6b9c0;margin-bottom:7px}
  .vs-primary{width:100%;padding:16px;border-radius:13px;border:none;font-size:16px;font-weight:700;cursor:pointer;
    background:#f4f4f5;color:#0a0a0c;font-family:'Inter',sans-serif;transition:transform .12s,box-shadow .2s;
    display:flex;align-items:center;justify-content:center;gap:8px}
  .vs-primary:hover{transform:translateY(-1px);box-shadow:0 12px 28px -10px rgba(255,255,255,.5)}
  .vs-primary:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
  .vs-legal{font-size:12px;color:rgba(255,255,255,.42);line-height:1.6}
  .vs-legal a,a.vs-legal{color:rgba(255,255,255,.72);text-decoration:none;cursor:pointer}
  .vs-legal a:hover,a.vs-legal:hover{text-decoration:underline}
  .vs-divider{display:flex;align-items:center;gap:14px;color:rgba(255,255,255,.3);font-size:12px;font-weight:600}
  .vs-divider>span{flex:1;height:1px;background:rgba(255,255,255,.12)}
  .vs-err{color:#ff7a8a;font-size:13px;font-weight:600;margin-top:14px;text-align:center;font-family:'Inter',sans-serif}
  .vs-linktext{text-align:center;margin-top:22px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);font-size:14px;color:#8a8d94;font-family:'Inter',sans-serif}
  .vs-linktext a{color:#fff;font-weight:600;text-decoration:none;cursor:pointer}
  .vs-tg-btn{display:inline-flex;align-items:center;gap:9px;height:36px;padding:0 16px;border-radius:9999px;border:none;cursor:pointer;
    font-family:'Inter',system-ui,sans-serif;font-size:14px;font-weight:700;color:#fff;
    background:linear-gradient(180deg,#2eb5f0,#1f9fdb);box-shadow:0 8px 22px -8px rgba(42,171,238,.7);
    transition:transform .12s,box-shadow .2s}
  .vs-tg-btn:hover{transform:translateY(-1px);box-shadow:0 12px 28px -8px rgba(42,171,238,.85)}
  .vs-tg-btn svg{width:16px;height:16px}
  @keyframes vs-rc-arrow{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
  .vs-rc-btn{display:inline-flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;
    border:1.5px solid rgba(255,255,255,.38);color:#fff;cursor:pointer;font-family:'Inter',system-ui,sans-serif;
    background:radial-gradient(circle at left,rgba(255,255,255,.08),transparent 40%),linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.015));
    box-shadow:0 0 22px rgba(255,255,255,.08),inset 0 0 22px rgba(255,255,255,.02);
    transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
  .vs-rc-btn:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.75);box-shadow:0 0 30px rgba(255,255,255,.16),inset 0 0 26px rgba(255,255,255,.035)}
  .vs-rc-btn:active{transform:translateY(0) scale(.99)}
  .vs-rc-avatar{width:42px;height:42px;flex:0 0 42px;border-radius:50%;position:relative;overflow:hidden;
    background:radial-gradient(circle at center,#1d3e91,#071024 75%);border:2px solid rgba(255,255,255,.85);box-shadow:0 0 10px rgba(255,255,255,.25)}
  .vs-rc-avatar .h{position:absolute;top:8px;left:10px;width:22px;height:17px;background:linear-gradient(#3d6cff,#1944cc);border-radius:6px 6px 2px 2px}
  .vs-rc-avatar .b{position:absolute;bottom:-6px;left:11px;width:25px;height:25px;background:#d8bd8f;border-radius:50%}
  .vs-rc-name{font-size:17px;font-weight:900;line-height:1;letter-spacing:-.5px;max-width:160px;margin-bottom:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .vs-rc-stats{display:flex;align-items:center;gap:11px}
  .vs-rc-stat{display:flex;flex-direction:column;align-items:flex-start}
  .vs-rc-stat strong{display:block;font-size:13px;line-height:.9;font-weight:900}
  .vs-rc-stat p{margin:3px 0 0;color:rgba(255,255,255,.55);font-size:7px;font-weight:800;line-height:1}
  .vs-rc-stats .vs-rc-line{width:1px;height:19px;background:rgba(255,255,255,.18)}
  .vs-rc-blue{color:#4ea1ff}.vs-rc-green{color:#37e44f}.vs-rc-red{color:#ff4f72}
  .vs-rc-arrow{width:24px;height:24px;flex:0 0 24px;border-radius:50%;display:grid;place-items:center;
    border:1.5px solid rgba(255,255,255,.45);color:#fff;font-size:14px;line-height:1;box-shadow:inset 0 0 10px rgba(255,255,255,.04);animation:vs-rc-arrow 2.6s ease-in-out infinite}
  .vs-rc-btn:hover .vs-rc-arrow{animation:none;transform:translateX(2px)}
  .vs-am-wrap{position:relative;display:inline-block}
  .vs-am-menu{position:absolute;top:100%;right:0;margin-top:8px;width:100%;min-width:250px;z-index:90;
    padding:8px;border:1px solid rgba(255,255,255,.21);border-radius:18px;
    background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012)),#080a0d;
    box-shadow:0 24px 60px -12px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06);
    font-family:'Inter',system-ui,sans-serif;animation:vs-in .22s cubic-bezier(.2,.8,.3,1) both}
  .vs-am-menu::before{content:"";position:absolute;left:0;right:0;top:-10px;height:10px}
  .vs-am-row{width:100%;min-height:44px;display:grid;grid-template-columns:34px 1px 1fr 18px;
    align-items:center;gap:12px;padding:8px 12px;margin-bottom:6px;border:1px solid rgba(255,255,255,.13);
    border-radius:13px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012));
    color:#f5f6f8;text-decoration:none;cursor:pointer;font:inherit;text-align:left;
    transition:transform .15s ease,background .15s ease,border-color .15s ease}
  .vs-am-row:last-child{margin-bottom:0}
  .vs-am-row:hover{transform:translateY(-1px);background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.24)}
  .vs-am-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;
    background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025));
    border:1px solid rgba(255,255,255,.09);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
  .vs-am-icon svg,.vs-am-chev svg{fill:none;stroke:#eceef2;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .vs-am-icon svg{width:17px;height:17px}
  .vs-am-chev{display:grid;place-items:center;opacity:.7}
  .vs-am-chev svg{width:15px;height:15px;stroke-width:2.5}
  .vs-am-sep{width:1px;height:24px;background:rgba(255,255,255,.55);justify-self:center}
  .vs-am-label{font-size:14px;font-weight:600;letter-spacing:-.01em;line-height:1}
  .vs-am-danger{color:#ff533a;border-color:rgba(255,83,58,.24);
    background:radial-gradient(circle at left,rgba(255,83,58,.12),transparent 40%),linear-gradient(180deg,rgba(255,83,58,.045),rgba(255,255,255,.01))}
  .vs-am-danger:hover{border-color:rgba(255,83,58,.4);background:rgba(255,83,58,.1)}
  .vs-am-danger .vs-am-icon{background:linear-gradient(180deg,rgba(255,83,58,.18),rgba(255,83,58,.055));border-color:rgba(255,83,58,.18)}
  .vs-am-danger .vs-am-icon svg,.vs-am-danger .vs-am-chev svg{stroke:#ff533a}
  .vs-am-danger .vs-am-sep{background:rgba(255,83,58,.6)}
  `
  var s = document.createElement('style')
  s.id = 'vs-auth-styles'
  s.textContent = css
  document.head.appendChild(s)
})()

const VsAppleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="#fff" {...props}><path d="M16.4 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.7-3.1.7-.6 0-1.6-.7-2.7-.7-1.4 0-2.6.8-3.3 2-.1.3-1.4 2.5-.4 5.2.5 1.3 1.1 2.8 2 2.8.8 0 1.1-.5 2.1-.5s1.2.5 2.1.5c.9 0 1.4-1.3 2-2.6.6-1 .9-1.9.9-2 0 0-1.7-.7-1.7-2.8ZM14.6 6.4c.5-.6.8-1.4.7-2.3-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.6-.4 2.2-1Z"/></svg>
)
const VsGoogleIcon = (props) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22Z" fill="#34A853"/><path d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6Z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3.1 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.5l3.3 2.6C7.2 7.7 9.4 6 12 6Z" fill="#EA4335"/></svg>
)
const VsCloseIcon = (props) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>
)
const VsTgIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z"/></svg>
)

function VsLoginModal({ onClose, onSwitch, onAuthed }) {
  const [email, setEmail] = vsUseState("")
  const [password, setPassword] = vsUseState("")
  const [err, setErr] = vsUseState("")
  const [busy, setBusy] = vsUseState(false)
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true)
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      const data = await r.json()
      if (!r.ok) { setErr(data.error || "Login failed."); setBusy(false); return }
      onAuthed(data.user)
    } catch { setErr("Network error."); setBusy(false) }
  }
  return (
    <div className="vs-scrim" onMouseDown={onClose}>
      <form className="vs-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" aria-label="Close" className="vs-close" onClick={onClose}><VsCloseIcon /></button>
        <div style={{ textAlign: "center" }}>
          <div className="vs-chrome">VERSUS</div>
          <h1 className="vs-h1">Welcome back</h1>
          <p className="vs-sub">Log in to get back in the arena.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 28 }}>
          <button type="button" className="vs-auth-btn"><VsAppleIcon />Apple</button>
          <button type="button" className="vs-auth-btn"><VsGoogleIcon />Google</button>
        </div>
        <div className="vs-divider" style={{ margin: "22px 0" }}><span></span>OR<span></span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <label className="vs-label">Email address</label>
            <input className="vs-field" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <label className="vs-label" style={{ marginBottom: 0 }}>Password</label>
              <a className="vs-legal" style={{ fontSize: 13 }}>Forgot?</a>
            </div>
            <input className="vs-field" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        {err && <div className="vs-err">{err}</div>}
        <button className="vs-primary" style={{ marginTop: 22 }} disabled={busy}>
          {busy ? "Logging in…" : <>Log in <span style={{ fontFamily: "JetBrains Mono" }}>&rarr;</span></>}
        </button>
        <div className="vs-linktext">New to Versus? <a onClick={onSwitch}>Create an account</a></div>
      </form>
    </div>
  )
}

function VsSignupModal({ onClose, onSwitch, onAuthed }) {
  const [emailMode, setEmailMode] = vsUseState(false)
  const [email, setEmail] = vsUseState("")
  const [password, setPassword] = vsUseState("")
  const [err, setErr] = vsUseState("")
  const [busy, setBusy] = vsUseState(false)
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true)
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      const data = await r.json()
      if (!r.ok) { setErr(data.error || "Sign up failed."); setBusy(false); return }
      onAuthed(data.user)
    } catch { setErr("Network error."); setBusy(false) }
  }
  return (
    <div className="vs-scrim" onMouseDown={onClose}>
      <div className="vs-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" className="vs-close" onClick={onClose}><VsCloseIcon /></button>
        <div style={{ textAlign: "center" }}>
          <div className="vs-chrome">VERSUS</div>
          <h1 className="vs-h1">Create your account</h1>
          <p className="vs-sub">Join the arena in under a minute.</p>
        </div>
        {!emailMode ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 30 }}>
              <button type="button" className="vs-auth-btn"><VsAppleIcon width="20" height="20" /><span className="lbl">Continue with Apple</span></button>
              <button type="button" className="vs-auth-btn"><VsGoogleIcon width="20" height="20" /><span className="lbl">Continue with Google</span></button>
              <div className="vs-divider" style={{ margin: "4px 0" }}><span></span>OR<span></span></div>
              <button type="button" className="vs-auth-btn" onClick={() => setEmailMode(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#c6c6ca" strokeWidth="1.8" width="20" height="20"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>
                <span className="lbl">Continue with email</span>
              </button>
            </div>
            <p className="vs-legal" style={{ marginTop: 24, textAlign: "center" }}>By continuing you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 28 }}>
              <div>
                <label className="vs-label">Email address</label>
                <input className="vs-field" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="vs-label">Password</label>
                <input className="vs-field" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {err && <div className="vs-err">{err}</div>}
            <button className="vs-primary" style={{ marginTop: 22 }} disabled={busy}>
              {busy ? "Creating…" : <>Create account <span style={{ fontFamily: "JetBrains Mono" }}>&rarr;</span></>}
            </button>
            <p className="vs-legal" style={{ marginTop: 16, textAlign: "center" }}>By continuing you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>.</p>
          </form>
        )}
        <div className="vs-linktext">Already have an account? <a onClick={onSwitch}>Log in</a></div>
      </div>
    </div>
  )
}

// Charge le script du widget Telegram une seule fois pour toute la page.
function vsLoadTelegramWidget() {
  if (window.__vsTgWidgetLoading) return window.__vsTgWidgetLoading
  window.__vsTgWidgetLoading = new Promise((resolve) => {
    if (window.Telegram && window.Telegram.Login) return resolve()
    const s = document.createElement("script")
    s.async = true
    s.src = "https://telegram.org/js/telegram-widget.js?22"
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.head.appendChild(s)
  })
  return window.__vsTgWidgetLoading
}

function VsTelegramButton({ onConnected }) {
  const [busy, setBusy] = vsUseState(false)
  const [cfg, setCfg] = vsUseState(null)
  vsUseEffect(() => {
    vsLoadTelegramWidget()
    fetch("/api/auth/config").then((r) => r.json())
      .then((d) => { if (d.telegram && d.telegram.bot_id) setCfg(d.telegram) })
      .catch(() => {})
  }, [])
  async function finish(payload) {
    try {
      const r = await fetch("/api/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await r.json()
      if (r.ok) onConnected(data.user)
      else alert((data && data.error) || "Telegram link failed.")
    } catch { alert("Network error.") }
    setBusy(false)
  }
  async function connect() {
    await vsLoadTelegramWidget()
    if (cfg && cfg.bot_id && window.Telegram && window.Telegram.Login) {
      setBusy(true)
      window.Telegram.Login.auth({ bot_id: cfg.bot_id, request_access: true },
        (user) => { if (user) finish(user); else setBusy(false) })
    } else {
      alert("Connexion Telegram indisponible : le bot n'est pas configuré (BOT_TOKEN + domaine dans BotFather).")
    }
  }
  return (
    <button className="vs-tg-btn" onClick={connect} disabled={busy}>
      <VsTgIcon />{busy ? "Connecting…" : "Connect Telegram"}
    </button>
  )
}

function VsRankCardButton({ user }) {
  const name = (user.telegram && user.telegram.username && "@" + user.telegram.username) || user.name || "@you"
  return (
    <button className="vs-rc-btn" type="button" aria-label={"Open " + name + " profile"}>
      <div className="vs-rc-avatar" aria-hidden="true"><div className="h"></div><div className="b"></div></div>
      <div style={{ textAlign: "left", minWidth: 0 }}>
        <div className="vs-rc-name">{name}</div>
        <div className="vs-rc-stats">
          <div className="vs-rc-stat"><strong className="vs-rc-blue">48</strong><p>scans</p></div>
          <div className="vs-rc-line"></div>
          <div className="vs-rc-stat"><strong className="vs-rc-green">31</strong><p>wins</p></div>
          <div className="vs-rc-line"></div>
          <div className="vs-rc-stat"><strong className="vs-rc-red">17</strong><p>defeats</p></div>
        </div>
      </div>
      <div className="vs-rc-arrow" aria-hidden="true">→</div>
    </button>
  )
}

const VsAmChevron = () => (
  <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
)

// Ligne du menu compte : lien placeholder ou bouton (Log out).
function VsAmRow({ danger, onClick, children, icon }) {
  const Tag = onClick ? 'button' : 'a'
  const extra = onClick ? { type: 'button', onClick } : { href: '#', onClick: (e) => e.preventDefault() }
  return (
    <Tag className={'vs-am-row' + (danger ? ' vs-am-danger' : '')} {...extra}>
      <span className="vs-am-icon" aria-hidden="true">{icon}</span>
      <span className="vs-am-sep" aria-hidden="true"></span>
      <span className="vs-am-label">{children}</span>
      <span className="vs-am-chev" aria-hidden="true"><VsAmChevron /></span>
    </Tag>
  )
}

// Bouton rank card + dropdown menu compte (ouvre au survol ET au clic).
function VsAccountMenu({ user, onLogout }) {
  const [open, setOpen] = vsUseState(false)
  const navigate = vsUseNavigate()
  const go = (path) => { setOpen(false); navigate(path) }
  const wrapRef = vsUseRef(null)
  const closeTimer = vsUseRef(null)
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const openNow = () => { cancelClose(); setOpen(true) }
  const closeSoon = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 140) }
  vsUseEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  vsUseEffect(() => cancelClose, [])
  return (
    <div className="vs-am-wrap" ref={wrapRef} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <div onClick={() => setOpen((o) => !o)}>
        <VsRankCardButton user={user} />
      </div>
      {open && (
        <div className="vs-am-menu" role="menu">
          <VsAmRow onClick={() => go('/profile')} icon={<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>}>Your profile</VsAmRow>
          <VsAmRow onClick={() => go('/account')} icon={<svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3" /></svg>}>Manage account</VsAmRow>
          <VsAmRow onClick={() => go('/groups')} icon={<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}>Your Groups</VsAmRow>
          <VsAmRow danger onClick={() => { setOpen(false); onLogout() }} icon={<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>}>Log out</VsAmRow>
        </div>
      )}
    </div>
  )
}

/* Drop-in pour le header. Gère son propre état auth + modales (portées vers body). */
export default function AuthCorner() {
  const [user, setUser] = vsUseState(() => apiGet("/api/auth/me")?.user ?? null)
  const [modal, setModal] = vsUseState(null) // "login" | "signup" | null
  vsUseEffect(() => {
    apiFetch("/api/auth/me").then((d) => setUser(d.user)).catch(() => {})
  }, [])
  // Applique un user authentifié + amorce le cache /api/auth/me (évite un état périmé au remount).
  const applyUser = (u) => { setUser(u); apiSet("/api/auth/me", { user: u }) }
  // Déconnexion : POST direct (apiFetch est un GET mémoïsé), puis reset user + cache.
  const logout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch {}
    setUser(null); apiSet("/api/auth/me", { user: null })
  }
  const modalEl = modal === "login" ? (
    <VsLoginModal onClose={() => setModal(null)} onSwitch={() => setModal("signup")} onAuthed={(u) => { applyUser(u); setModal(null) }} />
  ) : modal === "signup" ? (
    <VsSignupModal onClose={() => setModal(null)} onSwitch={() => setModal("login")} onAuthed={(u) => { applyUser(u); setModal(null) }} />
  ) : null
  return (
    <div className="flex items-center gap-3">
      {!user ? (
        <>
          <button onClick={() => setModal("login")} className="text-sm px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition">Sign In</button>
          <button onClick={() => setModal("signup")} className="text-sm px-4 py-2 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition">Sign Up</button>
        </>
      ) : !user.telegram ? (
        <VsTelegramButton onConnected={applyUser} />
      ) : (
        <VsAccountMenu user={user} onLogout={logout} />
      )}
      {modalEl && createPortal(modalEl, document.body)}
    </div>
  )
}
