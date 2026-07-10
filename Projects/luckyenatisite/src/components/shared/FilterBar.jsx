import React from 'react'

// Barre de chips de filtres (repris des maquettes new/versus_filters_1to1_left_match),
// adaptee a l'echelle de l'app. Le chip "filters" est pousse a droite via ml-auto.
// Les chips (hors "filters") trient la liste : la cle `key` pilote le comparateur
// dans lib/liveList.js. onChange(key) est appele au clic d'un chip de tri.

const I = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-none" {...props} />
)

// ---- Icones (paths repris des maquettes) ----
const IcUsers = () => (<I><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Z" /><path d="M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Z" /><path d="M8 13c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3Z" /><path d="M16 13c-.62 0-1.2.08-1.73.23 1.08.78 1.73 1.77 1.73 2.77v2h5v-2c0-1.66-2.33-3-5-3Z" /></I>)
const IcClock = () => (<I><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" /><path d="M12 7v5l3 2" /></I>)
const IcDollar = () => (<I><circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15.2 8.5c-.8-.8-2-.9-3.2-.9-1.8 0-3 .8-3 2.2 0 3.2 6 1.5 6 4.7 0 1.4-1.3 2.2-3.2 2.2-1.5 0-2.7-.4-3.7-1.3" /></I>)
const IcSpark = () => (<I><path d="M12 2l2.8 6.2L21 11l-6.2 2.8L12 20l-2.8-6.2L3 11l6.2-2.8L12 2Z" /><path d="M19 3v4" /><path d="M17 5h4" /></I>)
const IcCalendar = () => (<I><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /></I>)
const IcTrophy = () => (<I><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v2a3 3 0 0 0 3 3" /><path d="M16 6h3v2a3 3 0 0 1-3 3" /><path d="M12 12v5" /><path d="M8 20h8" /><path d="M9 17h6" /></I>)
const IcBolt = () => (<I><path d="M13 2L5 13h6l-1 9 8-12h-6l1-8Z" /></I>)
const IcTrend = () => (<I><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></I>)
const IcFunnel = () => (<I><path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" /></I>)

const FILTERS_CHIP = { key: 'filters', label: 'Filters', icon: IcFunnel, right: true }

export const TICKER_CHIPS = [
  { key: 'most-scanned', label: 'Most Scanned', icon: IcUsers },
  { key: 'latest-scan', label: 'Latest Scan', icon: IcClock },
  { key: 'market-cap', label: 'Market Cap', icon: IcDollar },
  { key: 'newest', label: 'Newest', icon: IcSpark },
  { key: 'oldest', label: 'Oldest', icon: IcCalendar },
  FILTERS_CHIP,
]

export const GROUP_CHIPS = [
  { key: 'top-ranked', label: 'Top Ranked', icon: IcTrophy },
  { key: 'most-members', label: 'Most Members', icon: IcUsers },
  { key: 'new-groups', label: 'New Groups', icon: IcSpark },
  { key: 'most-active', label: 'Most Active', icon: IcBolt },
  { key: 'fastest-growing', label: 'Fastest Growing', icon: IcTrend },
  FILTERS_CHIP,
]

export default function FilterBar({ chips, value, onChange, onFilters }) {
  return (
    <div className="flex items-center gap-2.5 mt-4 overflow-x-auto">
      {chips.map((c) => {
        const Icon = c.icon
        const isFilters = c.key === 'filters'
        const active = !isFilters && value === c.key
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => (isFilters ? (onFilters && onFilters()) : (onChange && onChange(c.key)))}
            className={'flex-none inline-flex items-center gap-2 h-11 px-4 text-sm font-medium whitespace-nowrap ' + (c.right ? 'ml-auto ' : '')}
            style={{
              // Style repris tel quel de new/versus_filters_1to1_left_match/styles.css (variante compacte)
              border: '1.5px solid rgba(255,255,255,0.205)',
              borderRadius: '10px',
              color: '#f7f7f7',
              letterSpacing: '-0.4px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035), 0 18px 55px rgba(0,0,0,0.22)',
              // Actif = meme bordure, fond nettement plus clair (indicateur bien visible du tri).
              background: active
                ? 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06)), rgba(0,1,1,0.92)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.004)), rgba(0,1,1,0.92)',
            }}
          >
            <Icon />
            <span>{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}
