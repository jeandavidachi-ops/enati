import React from 'react'
import PageShell from '../components/shared/PageShell.jsx'

// Contenu porte depuis new/Your Groups.dc.html (maquette statique, boucles sc-for expansees).
const CIRC = 144.5
const coinPalette = [
  ["#e8a33d", "#f0842a", "#2ab0c4", "#7bb542"],
  ["#c9ccce", "#2ab0c4", "#e8e8e8", "#e8c33d"],
  ["#2ab0c4", "#e8a33d", "#6b3fb0", "#f0842a"],
  ["#f0842a", "#2ab0c4", "#7bb542", "#3a3f45"],
  ["#1c1f22", "#f0842a", "#2a7fe0", "#8a8f95"],
  ["#2ab0c4", "#7bb542", "#e8c33d", "#e8a33d"],
  ["#1c1f22", "#6b3fb0", "#e8a33d", "#7bb542"],
  ["#2ab0c4", "#e8a33d", "#7bb542", "#f0842a"],
]
const groups = [
  { name: "Heroes", handle: "@heroescalls", avatarColor: "#1f6b3a", initial: "H", pct: 72, wins: 128, defeats: 49, calls: 177, coinsMore: "+12", members: "5.2K" },
  { name: "Alpha Wolves", handle: "@alphawolves", avatarColor: "#1c4f8a", initial: "A", pct: 64, wins: 96, defeats: 54, calls: 150, coinsMore: "+9", members: "3.1K" },
  { name: "Gem Lab", handle: "@gemlab", avatarColor: "#155e63", initial: "G", pct: 58, wins: 71, defeats: 51, calls: 122, coinsMore: "+7", members: "2.7K" },
  { name: "Top Callers", handle: "@topcallers", avatarColor: "#8a6d1c", initial: "T", pct: 81, wins: 210, defeats: 49, calls: 259, coinsMore: "+15", members: "8.7K" },
  { name: "Moon Hunters", handle: "@moonhunters", avatarColor: "#3a3f45", initial: "M", pct: 49, wins: 43, defeats: 45, calls: 88, coinsMore: "+6", members: "1.9K" },
  { name: "The Illuminati", handle: "@theilluminati", avatarColor: "#2a5c33", initial: "I", pct: 66, wins: 66, defeats: 34, calls: 100, coinsMore: "+8", members: "4.4K" },
  { name: "Dragons Den", handle: "@dragonsden", avatarColor: "#7a1f1f", initial: "D", pct: 53, wins: 55, defeats: 49, calls: 104, coinsMore: "+6", members: "2.2K" },
  { name: "Diamond Hands", handle: "@diamondhands", avatarColor: "#6b3fb0", initial: "D", pct: 75, wins: 120, defeats: 40, calls: 160, coinsMore: "+10", members: "6.1K" },
]
const requests = [
  { name: "Phantom Calls", handle: "@phantomcalls", avatarColor: "#5a2d8a", initial: "P", inviter: "Shadow", inviterHandle: "@shadowx", inviterColor: "#8a6d1c", inviterInitial: "S", calls: 132, members: "2.8K", requested: "2d ago" },
  { name: "Meta Masters", handle: "@metamasters", avatarColor: "#6b3fb0", initial: "M", inviter: "MetaMind", inviterHandle: "@metamind", inviterColor: "#3a3f45", inviterInitial: "M", calls: 98, members: "1.7K", requested: "5d ago" },
  { name: "Coin Kings", handle: "@coinkings", avatarColor: "#8a6d1c", initial: "C", inviter: "KingSol", inviterHandle: "@kingsol", inviterColor: "#7a1f1f", inviterInitial: "K", calls: 164, members: "3.6K", requested: "1w ago" },
  { name: "Alpha Signal", handle: "@alphasignal", avatarColor: "#1f6b3a", initial: "A", inviter: "SignalBot", inviterHandle: "@signalbot", inviterColor: "#2a5c33", inviterInitial: "S", calls: 76, members: "1.2K", requested: "3d ago" },
  { name: "Wolf Pack", handle: "@wolfpack", avatarColor: "#3a3f45", initial: "W", inviter: "LoneWolf", inviterHandle: "@lonewolf", inviterColor: "#1c1f22", inviterInitial: "L", calls: 89, members: "2.1K", requested: "4d ago" },
]

const usersIcon = (stroke) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`

const groupRows = groups.map((r, i) => {
  const offset = (CIRC * (1 - r.pct / 100)).toFixed(1)
  const border = i === groups.length - 1 ? "transparent" : "#1b2429"
  const coins = coinPalette[i].map((color) => `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid #0d1112;margin-left:-8px;"></div>`).join("")
  return `
  <div style="display:grid;grid-template-columns:2.1fr 1fr 0.8fr 0.9fr 1.15fr 2fr 1.1fr 0.4fr;align-items:center;height:88px;border-bottom:1px solid ${border};">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:52px;height:52px;border-radius:50%;flex-shrink:0;background:${r.avatarColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;">${r.initial}</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <span style="color:#ffffff;font-size:15px;font-weight:600;line-height:1;">${r.name}</span>
        <span style="color:#8b9599;font-size:13px;font-weight:400;line-height:1;">${r.handle}</span>
      </div>
    </div>
    <div style="position:relative;width:54px;height:54px;">
      <svg width="54" height="54" viewBox="0 0 54 54" style="display:block;">
        <circle cx="27" cy="27" r="23" fill="none" stroke="#1b2429" stroke-width="4"></circle>
        <circle cx="27" cy="27" r="23" fill="none" stroke="#00e676" stroke-width="4" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${offset}" transform="rotate(-90 27 27)"></circle>
      </svg>
      <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:13px;font-weight:600;">${r.pct}%</span>
    </div>
    <div style="color:#00e676;font-size:15px;font-weight:600;">${r.wins}</div>
    <div style="color:#ff3b24;font-size:15px;font-weight:600;">${r.defeats}</div>
    <div style="color:#d3d9db;font-size:15px;font-weight:500;">${r.calls}</div>
    <div style="display:flex;align-items:center;">
      <div style="display:flex;align-items:center;">${coins}</div>
      <span style="margin-left:12px;color:#8b9599;font-size:14px;font-weight:500;">${r.coinsMore}</span>
    </div>
    <div style="display:flex;align-items:center;gap:7px;">
      ${usersIcon("#8b9599")}
      <span style="color:#d3d9db;font-size:14px;font-weight:500;">${r.members}</span>
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#8b9599"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg>
    </div>
  </div>`
}).join("")

const requestRows = requests.map((r, i) => {
  const border = i === requests.length - 1 ? "transparent" : "#1b2429"
  return `
  <div style="display:grid;grid-template-columns:2fr 2fr 1.1fr 1.1fr 1.1fr 1.2fr;align-items:center;height:72px;border-bottom:1px solid ${border};">
    <div style="display:flex;align-items:center;gap:13px;">
      <div style="width:44px;height:44px;border-radius:50%;flex-shrink:0;background:${r.avatarColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;">${r.initial}</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">${r.name}</span>
        <span style="color:#8b9599;font-size:12px;font-weight:400;line-height:1;">${r.handle}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:11px;">
      <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:${r.inviterColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;">${r.inviterInitial}</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <span style="color:#ffffff;font-size:14px;font-weight:600;line-height:1;">${r.inviter}</span>
        <span style="color:#8b9599;font-size:12px;font-weight:400;line-height:1;">${r.inviterHandle}</span>
      </div>
    </div>
    <div style="color:#d3d9db;font-size:15px;font-weight:500;">${r.calls}</div>
    <div style="display:flex;align-items:center;gap:7px;">
      ${usersIcon("#8b9599")}
      <span style="color:#d3d9db;font-size:14px;font-weight:500;">${r.members}</span>
    </div>
    <div style="color:#8b9599;font-size:14px;font-weight:400;">${r.requested}</div>
    <div style="display:flex;align-items:center;gap:10px;justify-self:end;">
      <button style="width:46px;height:38px;border:1px solid rgba(0,230,118,0.45);background:transparent;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
      </button>
      <button style="width:46px;height:38px;border:1px solid rgba(255,59,36,0.45);background:transparent;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
      </button>
    </div>
  </div>`
}).join("")

const HTML = `
<div style="padding:34px 32px;box-sizing:border-box;font-family:'Inter',sans-serif;">
  <div style="display:flex;align-items:center;gap:12px;">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;position:relative;top:1px;">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
    <h1 style="margin:0;color:#ffffff;font-size:27px;font-weight:700;letter-spacing:-0.01em;line-height:1;">Your Groups</h1>
  </div>
  <p style="margin:10px 0 0 0;color:#8b9599;font-size:15px;font-weight:400;line-height:1;">All the groups you've joined and requested</p>

  <div style="display:flex;margin-top:26px;border:1px solid #253036;border-radius:8px;overflow:hidden;">
    <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:9px;height:74px;position:relative;border-bottom:2px solid #00e676;">
      <span style="color:#ffffff;font-size:15px;font-weight:600;">Joined Groups</span>
      <span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;box-sizing:border-box;background:#1b2429;color:#00e676;font-size:13px;font-weight:600;border-radius:6px;">8</span>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:9px;height:74px;position:relative;">
      <span style="color:#c4ccce;font-size:15px;font-weight:600;">Requested</span>
      <span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;box-sizing:border-box;background:#1b2429;color:#c4ccce;font-size:13px;font-weight:600;border-radius:6px;">2</span>
    </div>
  </div>

  <div style="margin-top:20px;border:1px solid #253036;border-radius:8px;background:#0d1112;padding:0 28px;">
    <div style="display:grid;grid-template-columns:2.1fr 1fr 0.8fr 0.9fr 1.15fr 2fr 1.1fr 0.4fr;align-items:center;height:52px;border-bottom:1px solid #1b2429;">
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Group</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Win Rate</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Wins</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Defeats</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Groups Calls</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Coins Called</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Members</div>
      <div></div>
    </div>
    ${groupRows}
  </div>

  <div style="margin-top:28px;border:1px solid #253036;border-radius:8px;background:#0d1112;padding:0 28px;">
    <div style="padding:22px 0 18px 0;">
      <div style="display:flex;align-items:center;gap:11px;">
        <span style="color:#ffffff;font-size:19px;font-weight:700;">Requests From Groups</span>
        <span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;box-sizing:border-box;background:#1b2429;color:#c4ccce;font-size:13px;font-weight:600;border-radius:6px;">5</span>
      </div>
      <p style="margin:9px 0 0 0;color:#8b9599;font-size:14px;font-weight:400;line-height:1;">Groups that have invited you to join</p>
    </div>
    <div style="display:grid;grid-template-columns:2fr 2fr 1.1fr 1.1fr 1.1fr 1.2fr;align-items:center;height:44px;border-bottom:1px solid #1b2429;">
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Group</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Invited By</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Groups Calls</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Members</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;">Requested</div>
      <div style="color:#8b9599;font-size:13px;font-weight:500;justify-self:end;">Action</div>
    </div>
    ${requestRows}
  </div>
</div>`

export default function YourGroups() {
  return (
    <PageShell>
      <div style={{ background: "#070808" }} dangerouslySetInnerHTML={{ __html: HTML }} />
    </PageShell>
  )
}
