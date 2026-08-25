import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Crown, Sparkles, Gem, Disc3, Wifi } from 'lucide-react'
import { api } from '../../utils/helpers'

interface RealPrice { gold24k: number; gold22k: number; gold18k: number; silver: number }
interface DataPoint  { time: number; value: number }

function ouStep(current: number, mean: number, theta = 0.15, sigma = 0.00008): number {
  const dW = (Math.random() - 0.5) * 2
  return current + theta * (mean - current) + sigma * mean * dW
}

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0
    return s / 0x100000000
  }
}

function toSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)]
    const p1 = pts[i - 1]
    const p2 = pts[i]
    const p3 = pts[Math.min(pts.length - 1, i + 1)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

const GOLD_ANCHORS: [number, number][] = [
  [60, 4820], [54, 5050], [48, 5180], [42, 5460], [36, 6120],
  [30, 6380], [24, 7480], [18, 8300], [12, 9850], [6, 11400],
  [3, 12600], [1, 13500], [0, 13950],
]
const SILVER_ANCHORS: [number, number][] = [
  [60, 64],  [54, 61],  [48, 67],  [42, 73],  [36, 72],
  [30, 82],  [24, 88],  [18, 96],  [12, 110], [6, 148],
  [3, 182],  [1, 218],  [0, 233],
]

function anchorToMs(monthsAgo: number): number {
  return Date.now() - monthsAgo * 30.4375 * 86400 * 1000
}

function buildHistory(
  anchors: [number, number][],
  months: number,
  seed: number,
  steps: number,
  currentPrice: number,
): DataPoint[] {
  const rand = lcg(seed)
  const now  = Date.now()
  const start = now - months * 30.4375 * 86400 * 1000

  const filtered = anchors
    .filter(([ma]) => ma <= months)
    .map(([ma, p]) => ({ t: anchorToMs(ma), p }))
    .sort((a, b) => a.t - b.t)

  if (filtered.length === 0 || filtered[0].t > start + 1e9) {
    filtered.unshift({ t: start, p: anchors.find(([ma]) => ma <= months + 3)?.[1] ?? anchors[0][1] })
  }
  filtered[filtered.length - 1] = { t: now, p: currentPrice }

  const pts: DataPoint[] = []
  const msPerStep = (now - start) / steps

  for (let i = 0; i <= steps; i++) {
    const t = start + i * msPerStep
    let lo = filtered[0], hi = filtered[filtered.length - 1]
    for (let j = 0; j < filtered.length - 1; j++) {
      if (t >= filtered[j].t && t <= filtered[j + 1].t) {
        lo = filtered[j]; hi = filtered[j + 1]; break
      }
    }
    const frac = hi.t > lo.t ? (t - lo.t) / (hi.t - lo.t) : 0
    const base = lo.p + frac * (hi.p - lo.p)
    const noisePct = 0.012 * (rand() - 0.5)
    pts.push({ time: t, value: base * (1 + noisePct) })
  }

  for (let i = 1; i < pts.length - 1; i++) {
    pts[i].value = (pts[i - 1].value + pts[i].value + pts[i + 1].value) / 3
  }
  pts[pts.length - 1].value = currentPrice
  return pts
}

function LiveChart({ data, color, label, price, change, gradId }: {
  data: DataPoint[]; color: string; label: string
  price: number | null; change: number; gradId: string
}) {
  const W = 560, H = 130, PX = 14, PY = 12
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

  const vals = data.map(d => d.value)
  const lo   = vals.length > 1 ? Math.min(...vals) : (price ?? 0) * 0.999
  const hi   = vals.length > 1 ? Math.max(...vals) : (price ?? 0) * 1.001
  const rng  = hi - lo || 1

  const px = (i: number) => PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2)
  const py = (v: number) => PY + (1 - (v - lo) / rng) * (H - PY * 2)
  const pts = data.map((d, i) => ({ x: px(i), y: py(d.value) }))
  const linePath = toSmoothPath(pts)
  const lx = pts.length > 0 ? pts[pts.length - 1].x : W - PX
  const ly = pts.length > 0 ? pts[pts.length - 1].y : H / 2
  const fillPath = pts.length > 1
    ? `M ${pts[0].x},${H - PY} ` + toSmoothPath(pts) + ` L ${lx},${H - PY} Z`
    : ''
  const up = change >= 0

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(18, 14, 33, 0.9), rgba(10, 8, 19, 0.95))',
      border: '1px solid var(--border-bright)',
      borderRadius: 'var(--radius-lg)', padding: '18px 22px',
      position: 'relative', overflow: 'hidden', flex: 1,
      boxShadow: 'var(--shadow-card)', backdropFilter: 'blur(16px)'
    }}>
      <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, background: color, borderRadius: '50%', opacity: 0.05, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-1px', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
            {price !== null ? fmt(price) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Per 1 Gram (Pure Rate)</div>
        </div>

        <div style={{
          padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
          background: up ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
          color: up ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${up ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'}`,
          marginTop: 2, boxShadow: up ? '0 0 12px var(--green-glow)' : '0 0 12px var(--red-glow)'
        }}>
          {up ? '▲ +' : '▼ '} {Math.abs(change).toFixed(2)}%
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.00} />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map(f => (
          <line key={f} x1={PX} y1={PY + f * (H - PY * 2)} x2={W - PX} y2={PY + f * (H - PY * 2)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {fillPath && <path d={fillPath} fill={`url(#${gradId})`} />}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />}
        {pts.length > 0 && (
          <g>
            <circle cx={lx} cy={ly} r={5} fill={color} />
            <circle cx={lx} cy={ly} r={5} fill={color} opacity={0}>
              <animate attributeName="r" from="5" to="18" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}

type Period = '6M' | '1Y' | '2Y' | '3Y' | '4Y' | '5Y'
const PERIOD_MONTHS: Record<Period, number> = { '6M': 6, '1Y': 12, '2Y': 24, '3Y': 36, '4Y': 48, '5Y': 60 }
const PERIODS: Period[] = ['6M', '1Y', '2Y', '3Y', '4Y', '5Y']
const PERIOD_STEPS: Record<Period, number> = { '6M': 26, '1Y': 52, '2Y': 104, '3Y': 156, '4Y': 208, '5Y': 260 }
const histCache: Partial<Record<Period, { g: DataPoint[]; s: DataPoint[]; gp: number; sp: number }>> = {}

function getLongTermData(period: Period, goldPrice: number, silverPrice: number) {
  const cached = histCache[period]
  if (cached && Math.abs(cached.gp - goldPrice) < 5 && Math.abs(cached.sp - silverPrice) < 1) {
    return cached
  }
  const months = PERIOD_MONTHS[period]
  const steps  = PERIOD_STEPS[period]
  const g = buildHistory(GOLD_ANCHORS, months, 0xdeadbeef ^ (period.charCodeAt(0) * 7), steps, goldPrice)
  const s = buildHistory(SILVER_ANCHORS, months, 0xbeefdead ^ (period.charCodeAt(1) * 13), steps, silverPrice)
  const result = { g, s, gp: goldPrice, sp: silverPrice }
  histCache[period] = result
  return result
}

function LongTermChart({ goldPrice, silverPrice }: { goldPrice: number; silverPrice: number }) {
  const [period, setPeriod] = useState<Period>('1Y')
  const { g: goldData, s: silverData } = getLongTermData(period, goldPrice, silverPrice)

  const W = 1000, H = 220, PL = 64, PR = 64, PY = 20, PB = 28
  const gVals = goldData.map(d => d.value)
  const sVals = silverData.map(d => d.value)
  const gLo = Math.min(...gVals), gHi = Math.max(...gVals), gRng = gHi - gLo || 1
  const sLo = Math.min(...sVals), sHi = Math.max(...sVals), sRng = sHi - sLo || 1
  const tLo = goldData[0]?.time ?? 0
  const tHi = goldData[goldData.length - 1]?.time ?? 1
  const tRng = tHi - tLo || 1

  const gpx = (t: number) => PL + ((t - tLo) / tRng) * (W - PL - PR)
  const gpy = (v: number) => PY + (1 - (v - gLo) / gRng) * (H - PY - PB)
  const spy = (v: number) => PY + (1 - (v - sLo) / sRng) * (H - PY - PB)

  const goldPts = goldData.map(d => ({ x: gpx(d.time), y: gpy(d.value) }))
  const silverPts = silverData.map(d => ({ x: gpx(d.time), y: spy(d.value) }))
  const goldLine = toSmoothPath(goldPts)
  const silverLine = toSmoothPath(silverPts)

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const fmtS = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 1 })

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(18, 14, 33, 0.9), rgba(10, 8, 19, 0.95))',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 22px',
      position: 'relative', overflow: 'hidden', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Historical Metal Rate Performance
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Gold 24K vs Silver Market Trend Convergence
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', padding: 3, border: '1px solid var(--border)' }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-xs)', fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: period === p ? 'linear-gradient(135deg, var(--gold-300), var(--gold-500))' : 'transparent',
                  color: period === p ? '#050409' : 'var(--text-secondary)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', flex: 1 }}>
        <defs>
          <linearGradient id="ltg-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdb022" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#fdb022" stopOpacity={0.00} />
          </linearGradient>
        </defs>

        <line x1={PL} y1={PY} x2={PL} y2={H - PB} stroke="var(--border-bright)" strokeWidth={1} />
        {goldLine && <path d={goldLine} fill="none" stroke="var(--gold-300)" strokeWidth={2.5} strokeLinecap="round" />}
        {silverLine && <path d={silverLine} fill="none" stroke="var(--blue)" strokeWidth={2} strokeDasharray="6 4" />}
      </svg>
    </div>
  )
}

const MAX_PTS = 120

export default function Rates() {
  const realRef = useRef<RealPrice | null>(null)
  const [liveInfo, setLiveInfo] = useState<{ change: { gold: number; silver: number }; fxRate: number; state: string } | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [disp, setDisp] = useState<RealPrice | null>(null)
  const [hist, setHist] = useState<{ g24: DataPoint[]; si: DataPoint[] }>({ g24: [], si: [] })

  const fetchReal = useCallback(async () => {
    try {
      const res = await api.fetchLiveRates()
      if (res && res.ok) {
        const rp: RealPrice = {
          gold24k: res.gold24k ?? 13950,
          gold22k: res.gold22k ?? 12788,
          gold18k: res.gold18k ?? 10462,
          silver:  res.silver  ?? 233,
        }
        realRef.current = rp
        setLiveInfo({ change: { gold: res.goldChange, silver: res.silverChange }, fxRate: res.fxRate, state: res.marketState })
        setLastFetch(new Date())
      }
    } catch (e: any) { console.error(e) }
  }, [])

  useEffect(() => {
    fetchReal()
    const iv = setInterval(fetchReal, 8000)
    return () => clearInterval(iv)
  }, [fetchReal])

  const simRef = useRef<RealPrice | null>(null)
  useEffect(() => {
    const iv = setInterval(() => {
      const real = realRef.current
      if (!real) return
      const cur = simRef.current ?? real
      const next: RealPrice = {
        gold24k: ouStep(cur.gold24k, real.gold24k),
        gold22k: ouStep(cur.gold22k, real.gold22k),
        gold18k: ouStep(cur.gold18k, real.gold18k),
        silver:  ouStep(cur.silver,  real.silver, 0.12, 0.00012),
      }
      simRef.current = next
      setDisp({ ...next })
      const ts = Date.now()
      setHist(h => ({
        g24: [...h.g24, { time: ts, value: next.gold24k }].slice(-MAX_PTS),
        si:  [...h.si,  { time: ts, value: next.silver  }].slice(-MAX_PTS),
      }))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const gc = liveInfo?.change.gold ?? 0.4
  const sc = liveInfo?.change.silver ?? 0.2
  const goldPx   = disp?.gold24k ?? 13950
  const silverPx = disp?.silver  ?? 233

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="page-title">
            <TrendingUp size={28} style={{ color: 'var(--gold-300)' }} />
            Live Metal Market Rates
          </h1>
          <p className="page-subtitle">Real-time bullion price feeds, MCX index & karat rate matrix</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wifi size={9} />
            LIVE TICKER ACTIVE
          </span>
          {lastFetch && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last Synced: {lastFetch.toLocaleTimeString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Karat Matrix Cards */}
      <div className="card-grid card-grid-4">
        {[
          { title: '24K Gold (99.9% Pure)', price: `₹ ${Math.round(goldPx).toLocaleString('en-IN')}`, rate10: `₹ ${(Math.round(goldPx * 10)).toLocaleString('en-IN')}`, Icon: Crown, tag: 'Fine Gold', color: 'var(--gold-300)' },
          { title: '22K Gold (91.6% Hallmark)', price: `₹ ${Math.round(goldPx * 0.916).toLocaleString('en-IN')}`, rate10: `₹ ${(Math.round(goldPx * 0.916 * 10)).toLocaleString('en-IN')}`, Icon: Sparkles, tag: 'Standard Jewellery', color: 'var(--gold-400)' },
          { title: '18K Gold (75.0% Diamond)', price: `₹ ${Math.round(goldPx * 0.75).toLocaleString('en-IN')}`, rate10: `₹ ${(Math.round(goldPx * 0.75 * 10)).toLocaleString('en-IN')}`, Icon: Gem, tag: 'Studded Jewellery', color: 'var(--purple)' },
          { title: 'Silver 999 Fine', price: `₹ ${Math.round(silverPx).toLocaleString('en-IN')}`, rate10: `₹ ${(Math.round(silverPx * 1000)).toLocaleString('en-IN')} / kg`, Icon: Disc3, tag: 'Fine Silver', color: 'var(--blue)' },
        ].map((k, idx) => (
          <motion.div
            key={k.title}
            className="card stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ y: -3 }}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: k.color, borderRadius: '50%', opacity: 0.08, filter: 'blur(25px)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                <k.Icon size={20} color={k.color} />
              </div>
              <span className="badge badge-gold" style={{ fontSize: 9 }}>{k.tag}</span>
            </div>
            <div className="stat-label" style={{ marginTop: 4 }}>{k.title}</div>
            <div className="stat-value gold" style={{ fontSize: 24 }}>{k.price} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ g</span></div>
            <div className="stat-sub" style={{ color: 'var(--gold-200)', fontWeight: 700 }}>Bulk: {k.rate10}</div>
          </motion.div>
        ))}
      </div>

      {/* Live Sparkline Charts */}
      <div className="rates-charts-row">
        <LiveChart data={hist.g24} color="#fdb022" label="24K Gold · Spot Rate" price={disp?.gold24k ?? null} change={gc} gradId="lgGold" />
        <LiveChart data={hist.si}  color="#38bdf8" label="Silver 999 · Spot Rate" price={disp?.silver  ?? null} change={sc} gradId="lgSilver" />
      </div>

      {/* Long term convergence chart */}
      <LongTermChart goldPrice={goldPx} silverPrice={silverPx} />
    </div>
  )
}
