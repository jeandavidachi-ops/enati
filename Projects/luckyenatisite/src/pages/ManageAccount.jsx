import React, { useState } from 'react'
import PageShell from '../components/shared/PageShell.jsx'
import { useApi } from '../lib/api.js'
import useTelegramConnect from '../components/shared/useTelegramConnect.js'

// En-tete de la page.
const HTML_HEADER = `
<div style="margin-bottom:26px;">
  <h1 style="margin:0;color:#ffffff;font-size:27px;font-weight:700;letter-spacing:-0.01em;line-height:1;">Manage Account</h1>
  <p style="margin:11px 0 0 0;color:#8b9599;font-size:15px;font-weight:400;line-height:1;">Update your login, security and account preferences</p>
</div>`

// Cartes statiques AU-DESSUS de "Connected Accounts" (Account Details + Security).
const HTML_TOP = `
<div style="border:1px solid #253036;border-radius:8px;background:#101314;">
  <div style="padding:22px 26px 18px 26px;border-bottom:1px solid #1b2429;">
    <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;line-height:1;">Account Details</h2>
    <p style="margin:8px 0 0 0;color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Manage the email, username and Telegram linked to your profile</p>
  </div>
  <div style="padding:24px 26px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div style="grid-column:1 / -1;display:flex;flex-direction:column;gap:8px;">
      <label style="color:#8b9599;font-size:13px;font-weight:500;">Email Address</label>
      <input value="ape@versus.gg" style="height:44px;background:#0d1112;border:1px solid #253036;border-radius:7px;color:#ffffff;font-size:14px;padding:0 14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label style="color:#8b9599;font-size:13px;font-weight:500;">Username</label>
      <input value="@degenape" style="height:44px;background:#0d1112;border:1px solid #253036;border-radius:7px;color:#ffffff;font-size:14px;padding:0 14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label style="color:#8b9599;font-size:13px;font-weight:500;">Telegram Username</label>
      <input value="@degen_ape" style="height:44px;background:#0d1112;border:1px solid #253036;border-radius:7px;color:#ffffff;font-size:14px;padding:0 14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
  </div>
  <div style="padding:18px 26px;border-top:1px solid #1b2429;display:flex;justify-content:flex-end;">
    <button style="height:42px;padding:0 22px;background:#00e676;border:none;border-radius:7px;color:#04130b;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Save changes</button>
  </div>
</div>

<div style="border:1px solid #253036;border-radius:8px;background:#101314;">
  <div style="padding:22px 26px 18px 26px;border-bottom:1px solid #1b2429;">
    <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;line-height:1;">Security</h2>
    <p style="margin:8px 0 0 0;color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Change your password to keep your account secure</p>
  </div>
  <div style="padding:24px 26px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div style="grid-column:1 / -1;display:flex;flex-direction:column;gap:8px;">
      <label style="color:#8b9599;font-size:13px;font-weight:500;">Current Password</label>
      <input type="password" value="password123" style="height:44px;background:#0d1112;border:1px solid #253036;border-radius:7px;color:#ffffff;font-size:14px;padding:0 14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label style="color:#8b9599;font-size:13px;font-weight:500;">New Password</label>
      <input type="password" value="password123" style="height:44px;background:#0d1112;border:1px solid #253036;border-radius:7px;color:#ffffff;font-size:14px;padding:0 14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label style="color:#8b9599;font-size:13px;font-weight:500;">Confirm New Password</label>
      <input type="password" value="password123" style="height:44px;background:#0d1112;border:1px solid #253036;border-radius:7px;color:#ffffff;font-size:14px;padding:0 14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
  </div>
  <div style="padding:18px 26px;border-top:1px solid #1b2429;display:flex;justify-content:flex-end;">
    <button style="height:42px;padding:0 22px;background:#00e676;border:none;border-radius:7px;color:#04130b;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Update password</button>
  </div>
</div>`

// Cartes statiques EN-DESSOUS (Solana Wallet + Login Sessions + Danger Zone).
const HTML_BOTTOM = `
<div style="border:1px solid #253036;border-radius:8px;background:#101314;">
  <div style="padding:22px 26px 18px 26px;border-bottom:1px solid #1b2429;">
    <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;line-height:1;">Solana Wallet</h2>
    <p style="margin:8px 0 0 0;color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Connect a wallet to verify ownership of your on-chain activity</p>
  </div>
  <div style="padding:2px 26px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #1b2429;">
      <div style="display:flex;align-items:center;gap:15px;">
        <div style="width:42px;height:42px;border-radius:8px;background:#0d1112;border:1px solid #253036;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#c4ccce" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"></path><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"></path><path d="M21 11h-5a2 2 0 0 0 0 4h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z"></path></svg>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">Primary wallet</span>
            <span style="display:inline-flex;align-items:center;height:20px;padding:0 8px;background:#12211a;color:#00e676;font-size:11px;font-weight:600;border-radius:5px;">Verified</span>
          </div>
          <span style="color:#c4ccce;font-size:13px;font-weight:500;font-family:monospace;line-height:1;">7xK...9pQ</span>
        </div>
      </div>
      <button style="height:40px;padding:0 20px;background:transparent;border:1px solid rgba(255,59,36,0.45);border-radius:7px;color:#ff3b24;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;">Disconnect</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #1b2429;">
      <div style="display:flex;align-items:center;gap:15px;">
        <div style="width:42px;height:42px;border-radius:8px;background:#0d1112;border:1px solid #253036;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#545e62" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">Add another wallet</span>
          <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1;">No wallet connected</span>
        </div>
      </div>
      <button style="height:40px;padding:0 20px;background:transparent;border:1px solid #253036;border-radius:7px;color:#d3d9db;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;">Connect wallet</button>
    </div>
    <div style="display:flex;align-items:center;gap:9px;padding:16px 0;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b9599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1.4;">Read-only wallet verification. Versus will never request spending permission.</span>
    </div>
  </div>
</div>

<div style="border:1px solid #253036;border-radius:8px;background:#101314;">
  <div style="padding:22px 26px 18px 26px;border-bottom:1px solid #1b2429;">
    <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;line-height:1;">Login Sessions</h2>
    <p style="margin:8px 0 0 0;color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Devices currently signed in to your account</p>
  </div>
  <div style="padding:4px 26px 8px 26px;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid #1b2429;">
      <div style="display:flex;align-items:center;gap:15px;">
        <div style="width:42px;height:42px;border-radius:8px;background:#0d1112;border:1px solid #253036;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#c4ccce" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">MacBook Pro · Chrome · Dubai</span>
            <span style="display:inline-flex;align-items:center;height:20px;padding:0 8px;background:#12211a;color:#00e676;font-size:11px;font-weight:600;border-radius:5px;">Current session</span>
          </div>
          <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Last active now</span>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0;">
      <div style="display:flex;align-items:center;gap:15px;">
        <div style="width:42px;height:42px;border-radius:8px;background:#0d1112;border:1px solid #253036;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c4ccce" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"></rect><path d="M12 18h.01"></path></svg>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">iPhone · Safari</span>
          <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Last active 2h ago</span>
        </div>
      </div>
    </div>
  </div>
  <div style="padding:18px 26px;border-top:1px solid #1b2429;display:flex;justify-content:flex-end;">
    <button style="height:42px;padding:0 20px;background:transparent;border:1px solid #253036;border-radius:7px;color:#d3d9db;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Log out all other sessions</button>
  </div>
</div>

<div style="border:1px solid #3a1c19;border-radius:8px;background:#101314;">
  <div style="padding:22px 26px 18px 26px;border-bottom:1px solid #1b2429;">
    <h2 style="margin:0;color:#ff3b24;font-size:18px;font-weight:700;line-height:1;">Danger Zone</h2>
    <p style="margin:8px 0 0 0;color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Irreversible and destructive actions for your account</p>
  </div>
  <div style="padding:2px 26px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #1b2429;">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">Deactivate account</span>
        <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Temporarily disable your profile and group visibility</span>
      </div>
      <button style="height:40px;padding:0 20px;background:transparent;border:1px solid rgba(255,59,36,0.45);border-radius:7px;color:#ff3b24;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;">Deactivate</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 0;">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">Delete account</span>
        <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1;">Permanently delete your profile, calls, groups and history</span>
      </div>
      <button style="height:40px;padding:0 20px;background:#ff3b24;border:none;border-radius:7px;color:#ffffff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;">Delete account</button>
    </div>
  </div>
</div>`

// Carte "Connected Accounts" en JSX : la ligne Telegram est fonctionnelle et
// reutilise EXACTEMENT le flux du header (useTelegramConnect).
function ConnectedAccountsCard() {
  const me = useApi('/api/auth/me')
  const [user, setUser] = useState(null)
  const [note, setNote] = useState(null) // { ok:bool, text }

  const current = user || (me && me.user) || null
  const tg = current && current.telegram
  const tgLabel = tg ? (tg.username ? '@' + tg.username : (tg.firstName || 'Connecté')) : 'Non connecté'

  const { connect, busy } = useTelegramConnect({
    onConnected: (u) => {
      setUser(u)
      const un = u && u.telegram && u.telegram.username
      setNote({ ok: true, text: un ? `Compte Telegram mis à jour (@${un})` : 'Compte Telegram mis à jour' })
    },
    onError: (msg) => setNote({ ok: false, text: msg }),
  })

  return (
    <div style={{ border: '1px solid #253036', borderRadius: 8, background: '#101314' }}>
      <div style={{ padding: '22px 26px 18px 26px', borderBottom: '1px solid #1b2429' }}>
        <h2 style={{ margin: 0, color: '#ffffff', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Connected Accounts</h2>
        <p style={{ margin: '8px 0 0 0', color: '#8b9599', fontSize: 13, fontWeight: 400, lineHeight: 1 }}>Link your social accounts to verify your identity</p>
      </div>
      <div style={{ padding: '2px 26px' }}>
        {/* X (Twitter) — statique pour l'instant */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '20px 0', borderBottom: '1px solid #1b2429' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, background: '#0d1112', border: '1px solid #253036', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#c4ccce"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, lineHeight: 1 }}>X Account</span>
              <span style={{ color: '#8b9599', fontSize: 13, fontWeight: 400, lineHeight: 1 }}>Not connected</span>
            </div>
          </div>
          <button style={{ height: 40, padding: '0 20px', background: 'transparent', border: '1px solid #253036', borderRadius: 7, color: '#d3d9db', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Connect X</button>
        </div>
        {/* Telegram — fonctionnel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, background: '#0d1112', border: '1px solid #253036', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#c4ccce" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 4.5L2.5 11.5l6.5 2.2M21.5 4.5L18 20l-6-6M21.5 4.5L9 13.7M9 13.7V19l3-2.9"></path></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, lineHeight: 1 }}>Telegram Account</span>
                {tg && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', background: '#12211a', color: '#00e676', fontSize: 11, fontWeight: 600, borderRadius: 5 }}>Connected</span>}
              </div>
              <span style={{ color: '#8b9599', fontSize: 13, fontWeight: 400, lineHeight: 1 }}>{tgLabel}</span>
            </div>
          </div>
          <button onClick={connect} disabled={busy} style={{ height: 40, padding: '0 20px', background: 'transparent', border: '1px solid #253036', borderRadius: 7, color: '#d3d9db', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Connecting…' : (tg ? 'Change' : 'Connect')}
          </button>
        </div>
        {note && (
          <div style={{ padding: '0 0 16px 0', color: note.ok ? '#00e676' : '#ff7a8a', fontSize: 13, fontWeight: 500 }}>{note.text}</div>
        )}
      </div>
    </div>
  )
}

const colStack = { display: 'flex', flexDirection: 'column', gap: 18 }

export default function ManageAccount() {
  return (
    <PageShell>
      <div style={{ background: '#070808' }}>
        <div style={{ padding: 38, boxSizing: 'border-box', fontFamily: "'Inter',sans-serif" }}>
          <div dangerouslySetInnerHTML={{ __html: HTML_HEADER }} />
          <div style={colStack}>
            <div style={colStack} dangerouslySetInnerHTML={{ __html: HTML_TOP }} />
            <ConnectedAccountsCard />
            <div style={colStack} dangerouslySetInnerHTML={{ __html: HTML_BOTTOM }} />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
