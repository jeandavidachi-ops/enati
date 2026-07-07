import React from 'react'

// --- Helpers d'affichage -------------------------------------------------
export function fmtMc(v) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (!isFinite(n)) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B MC`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M MC`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K MC`
  if (n >= 1) return `$${n.toFixed(2)} MC`
  return `$${n.toPrecision(3)} MC`
}
export function fmtJoined(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts) * 1000)
  return `Joined ${d.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
}
export function fmtPnl(pct) {
  if (pct === null || pct === undefined) return { text: '—', color: '#9aa0a4' }
  const p = Number(pct)
  const sign = p >= 0 ? '+' : ''
  return { text: `${sign}${p.toFixed(2)}%`, color: p >= 0 ? '#4ade80' : '#f0564a' }
}

export const CARD = { background: '#101314', border: '1px solid #24282c', borderRadius: 8 }
const RING_CIRC = 2 * Math.PI * 63 // ~395.84

// --- Sous-composants -----------------------------------------------------
function StatCard({ label, value, icon }) {
  return (
    <div style={{ ...CARD, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {icon}
      <div>
        <div style={{ fontSize: 13, color: '#7a8085', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.05, marginTop: 3 }}>{value}</div>
      </div>
    </div>
  )
}

function WinRateCard({ stats }) {
  const wr = stats?.win_rate ?? 0
  const wins = stats?.wins ?? 0
  const defeats = stats?.defeats ?? 0
  const calls = wins + defeats
  const offset = RING_CIRC * (1 - Math.max(0, Math.min(100, wr)) / 100)
  const Row = ({ color, label, value, border }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 0', borderBottom: border ? '1px solid #24282c' : 'none' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }}></span>
      <span style={{ fontSize: 15, color: '#e6e8ea', marginLeft: 11 }}>{label}</span>
      <span style={{ flex: 1 }}></span>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{value}</span>
    </div>
  )
  return (
    <div style={{ ...CARD, gridColumn: '1 / 2', alignSelf: 'stretch', width: '100%', minHeight: 300, padding: 24, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Win Rate</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, margin: 'auto 0' }}>
        <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
          <svg width="150" height="150" viewBox="0 0 150 150">
            <defs><linearGradient id="wrGrad" x1="0.1" y1="0.1" x2="1" y2="0.35"><stop offset="0" stopColor="#4ade80" /><stop offset="0.7" stopColor="#20b451" /><stop offset="1" stopColor="#0d7a37" /></linearGradient></defs>
            <circle cx="75" cy="75" r="63" fill="none" stroke="#23272b" strokeWidth="14" />
            <circle cx="75" cy="75" r="63" fill="none" stroke="url(#wrGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={offset} transform="rotate(-90 75 75)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{wr}%</div>
            <div style={{ fontSize: 13, color: '#9aa0a4', marginTop: 6 }}>Win Rate</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Row color="#22c55e" label="Total Wins" value={wins} border />
          <Row color="#ef4444" label="Total Defeats" value={defeats} border />
          <Row color="#cfd3d6" label="Total Calls" value={calls} />
        </div>
      </div>
    </div>
  )
}

function TokenCell({ symbol, image, size = 26 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {image
        ? <img src={image} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', background: '#1b2022' }} />
        : <span style={{ width: size, height: size, borderRadius: '50%', background: '#1b2022', flexShrink: 0 }}></span>}
      <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{symbol}</span>
    </div>
  )
}

function GroupCallsCard({ rows }) {
  const cols = '1.55fr 1.35fr 1.7fr 1.15fr'
  return (
    <div style={{ ...CARD, gridColumn: '2 / 3', alignSelf: 'start', width: '100%', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Groups Calls</span>
      </div>
      <div style={{ fontSize: 13, color: '#7a8085', marginTop: 5 }}>All calls from the groups you're in</div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 10, alignItems: 'center', padding: '16px 0 12px', borderBottom: '1px solid #1f2427' }}>
        <span style={{ fontSize: 13, color: '#7a8085' }}>Token</span>
        <span style={{ fontSize: 13, color: '#7a8085' }}>First Call</span>
        <span style={{ fontSize: 13, color: '#7a8085' }}>Current MCAP</span>
        <span style={{ fontSize: 13, color: '#7a8085' }}>User</span>
      </div>
      {rows.length === 0 && <div style={{ padding: '20px 0', color: '#7a8085', fontSize: 14 }}>No calls yet.</div>}
      {/* ~9 lignes visibles (44px/ligne) puis scroll vertical. */}
      <div style={{ maxHeight: 396, overflowY: 'auto' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #191d1f' }}>
            <TokenCell symbol={r.symbol} image={r.image} />
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, color: '#e6e8ea', whiteSpace: 'nowrap' }}>{fmtMc(r.mcap_then)}</div><div style={{ fontSize: 12, color: '#7a8085', marginTop: 2, whiteSpace: 'nowrap' }}>{r.ago}</div></div>
            <div style={{ fontSize: 14, color: '#e6e8ea', minWidth: 0, whiteSpace: 'nowrap' }}>{fmtMc(r.mcap_now)}</div>
            <div style={{ fontSize: 13, color: '#787e83', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.caller_username ? '@' + r.caller_username : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function YourCallsCard({ rows, title = 'Your Calls' }) {
  const cols = '2.6fr 2fr 2.4fr 1.4fr'
  return (
    <div style={{ ...CARD, gridColumn: '1 / -1', width: '100%', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{title}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#9aa0a4', background: '#1e2225', borderRadius: 6, padding: '2px 8px' }}>{rows.length}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 10, alignItems: 'center', padding: '18px 0 12px', borderBottom: '1px solid #1f2427' }}>
        <span style={{ fontSize: 13, color: '#7a8085' }}>Token</span>
        <span style={{ fontSize: 13, color: '#7a8085' }}>First Call</span>
        <span style={{ fontSize: 13, color: '#7a8085' }}>Current MCAP</span>
        <span style={{ fontSize: 13, color: '#7a8085', textAlign: 'right' }}>PnL</span>
      </div>
      {rows.length === 0 && <div style={{ padding: '20px 0', color: '#7a8085', fontSize: 14 }}>No calls yet.</div>}
      {rows.map((r, i) => {
        const pnl = fmtPnl(r.pnl_pct)
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 10, alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #17191b' }}>
            <TokenCell symbol={r.symbol} image={r.image} size={30} />
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, color: '#e6e8ea', whiteSpace: 'nowrap' }}>{fmtMc(r.mcap_then)}</div><div style={{ fontSize: 12, color: '#7a8085', marginTop: 2, whiteSpace: 'nowrap' }}>{r.ago}</div></div>
            <div style={{ fontSize: 14, color: '#e6e8ea', minWidth: 0, whiteSpace: 'nowrap' }}>{fmtMc(r.mcap_now)}</div>
            <div style={{ textAlign: 'right', minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: pnl.color, whiteSpace: 'nowrap' }}>{pnl.text}</div></div>
          </div>
        )
      })}
    </div>
  )
}

// --- Contenu de profil reutilisable -------------------------------------
// `data` : objet profil resolu (schema /api/me/profile ou /api/user/<id>/profile).
// `me`   : snapshot /api/auth/me (optionnel, pre-affichage instantane pour son propre profil).
// `callsTitle` : titre de la table du bas ("Your Calls" par defaut).
export default function ProfileContent({ data, me, callsTitle = 'Your Calls', showGroupsCreated = true }) {
  const tg = data?.telegram || me?.telegram || {}
  const stats = data?.stats || me?.stats || {}
  const name = tg.firstName || (tg.username ? '@' + tg.username : (data?.name || me?.name || 'You'))
  const handle = tg.username ? '@' + tg.username : ''

  return (
    <div style={{ background: '#070808' }}>
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '470px 1fr', gap: 18, alignItems: 'start', fontFamily: "'Inter',system-ui,sans-serif" }}>

        {/* Header */}
        <div style={{ ...CARD, gridColumn: '1 / -1', width: '100%', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
          {tg.id
            ? <img src={`/api/user-photo/${tg.id}`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', background: 'radial-gradient(circle at 50% 40%,#1b2022,#0d1011)' }} />
            : <div style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 50% 40%,#1b2022,#0d1011)' }}></div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{name}</div>
            {handle && <div style={{ fontSize: 14, color: '#7a8085', marginTop: 6 }}>{handle}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#7a8085' }}>{stats.scans ?? 0} scans</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#7a8085' }}>{fmtJoined(data?.joined_at)}</div>
            </div>
          </div>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <StatCard label="Groups Joined" value={stats.groups_joined ?? 0}
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="#7a8085" strokeWidth="1.6" /><path d="M3.5 19c0-3 2.6-5 5.5-5s5.5 2 5.5 5" stroke="#7a8085" strokeWidth="1.6" strokeLinecap="round" /><path d="M16 6.2a3 3 0 010 5.6M18 19c0-2.4-1.3-4.2-3-4.8" stroke="#7a8085" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
            {showGroupsCreated && (
            <StatCard label="Groups Created" value={stats.groups_created ?? 0}
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.8l-5.2 2.72.99-5.8-4.21-4.1 5.82-.85L12 3.5z" stroke="#7a8085" strokeWidth="1.6" strokeLinejoin="round" /></svg>} />
            )}
          </div>
        </div>

        <WinRateCard stats={stats} />
        <GroupCallsCard rows={data?.group_calls || []} />
        <YourCallsCard rows={data?.your_calls || []} title={callsTitle} />

      </div>
    </div>
  )
}
