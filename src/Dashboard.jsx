import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CustomTooltip, formatDateKey, formatMinutes } from './utils.jsx';

// ── Navigation config ──────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', dot: 'dot-accent' },
  { id: 'sentiment', label: 'Sentiment', dot: 'dot-teal' },
  { id: 'power', label: 'Power & intensity', dot: 'dot-coral' },
  { id: 'flags', label: 'Coaching flags', dot: 'dot-amber' },
  { id: 'ta', label: 'Ego states', dot: 'dot-purple' },
  { id: 'drama', label: 'Drama Triangle', dot: 'dot-coral' },
  { id: 'strokes', label: 'Stroke economy', dot: 'dot-green' },
  { id: 'games', label: 'Psych games', dot: 'dot-purple' },
  { id: 'latency', label: 'Reply latency', dot: 'dot-gray' },
];

// ── Main Dashboard ─────────────────────────────
export function Dashboard({ data, onReset }) {
  const [view, setView] = useState('overview');
  const { kpi, days, flags, regimes, egoTotals, strokes, dramaInstances, games, selfName, otherName, isDemo } = data;

  const regimeColors = { warm: '#7ab87a', neutral: '#5e5c58', tense: '#d4a35c', rupture: '#d97062', repair: '#5cbfaa' };

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">RL</div>
          <div>
            <div className="header-title">Relational Lens</div>
            <div className="header-subtitle">{selfName} ↔ {otherName} · {kpi.daysSpan} days · {kpi.totalMessages} messages{isDemo ? ' · demo data' : ''}</div>
          </div>
        </div>
        <div className="header-meta">
          <span style={{color:'var(--text3)'}}>{flags.filter(f=>f.severity==='act').length} action flags</span>
          <button className="btn btn-ghost btn-small" onClick={onReset}>← New analysis</button>
        </div>
      </header>

      {/* KPI bar */}
      <div className="kpi-bar">
        <div className="kpi-item">
          <div className="kpi-label">Total messages</div>
          <div className="kpi-value accent">{kpi.totalMessages}</div>
          <div className="kpi-sub">{kpi.selfCount} you · {kpi.otherCount} them</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Avg self sentiment</div>
          <div className={`kpi-value ${kpi.avgSelfSentiment > 0 ? 'teal' : 'coral'}`}>
            {kpi.avgSelfSentiment > 0 ? '+' : ''}{kpi.avgSelfSentiment.toFixed(2)}
          </div>
          <div className="kpi-sub">{kpi.avgSelfSentiment > 0.1 ? 'Positive' : kpi.avgSelfSentiment < -0.1 ? 'Negative' : 'Neutral'}</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Avg reply delay (you)</div>
          <div className="kpi-value">{formatMinutes(kpi.avgSelfReplyMin)}</div>
          <div className="kpi-sub">median response time</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Coaching flags</div>
          <div className="kpi-value coral">{flags.length}</div>
          <div className="kpi-sub">{flags.filter(f=>f.severity==='act').length} act · {flags.filter(f=>f.severity==='watch').length} watch</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Repairs detected</div>
          <div className="kpi-value teal">{kpi.totalRepairs}</div>
          <div className="kpi-sub">Gottman gold</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Rapid follow-ups</div>
          <div className={`kpi-value ${kpi.totalInterruptions > 5 ? 'coral' : ''}`}>{kpi.totalInterruptions}</div>
          <div className="kpi-sub">attachment bursts</div>
        </div>
      </div>

      {/* Regime strip */}
      <div className="regime-strip">
        {regimes.map((r, i) => (
          <div
            key={r.dateKey}
            className={`regime-segment regime-${r.regime}`}
            style={{ flex: 1 }}
            title={`${r.dateKey}: ${r.regime}`}
          >
            {regimes.length < 30 ? r.regime.slice(0,3) : ''}
          </div>
        ))}
      </div>

      <div className="content">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="nav-section">
            <div className="nav-section-label">Analytics</div>
            {NAV.map(n => (
              <div
                key={n.id}
                className={`nav-item ${view === n.id ? 'active' : ''}`}
                onClick={() => setView(n.id)}
              >
                <div className={`nav-item-dot ${n.dot}`} />
                {n.label}
              </div>
            ))}
          </div>
        </nav>

        {/* Main panel */}
        <main className="main-panel">
          {view === 'overview' && <ViewOverview data={data} regimeColors={regimeColors} />}
          {view === 'sentiment' && <ViewSentiment days={days} selfName={selfName} otherName={otherName} />}
          {view === 'power' && <ViewPower days={days} selfName={selfName} />}
          {view === 'flags' && <ViewFlags flags={flags} />}
          {view === 'ta' && <ViewTA days={days} egoTotals={egoTotals} />}
          {view === 'drama' && <ViewDrama dramaInstances={dramaInstances} />}
          {view === 'strokes' && <ViewStrokes strokes={strokes} days={days} selfName={selfName} otherName={otherName} />}
          {view === 'games' && <ViewGames games={games} />}
          {view === 'latency' && <ViewLatency days={days} selfName={selfName} otherName={otherName} />}
        </main>
      </div>
    </div>
  );
}

// ── Overview ───────────────────────────────────
function ViewOverview({ data, regimeColors }) {
  const { kpi, days, flags, regimes, egoTotals, strokes, games, selfName, otherName } = data;
  const egoTotal = Object.values(egoTotals).reduce((a, b) => a + b, 0);
  const egoData = Object.entries(egoTotals).map(([k, v]) => ({
    name: k, value: v, pct: egoTotal ? Math.round(v / egoTotal * 100) : 0
  }));

  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Overview</span>
        <span className="section-subtitle">{days.length} day window</span>
      </div>

      {/* Sentiment + power combined */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Sentiment over time</div>
          <div className="chart-card-note">Positive = warmer tone, Negative = critical/withdrawn</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Line type="monotone" dataKey="selfSentiment" name="You" stroke="#5cbfaa" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="otherSentiment" name="Them" stroke="#9b7fd4" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        {/* Ego state breakdown */}
        <div className="chart-card">
          <div className="chart-card-header"><div className="chart-card-title">Your ego states (TA)</div></div>
          {egoData.map(e => (
            <div key={e.name} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text2)' }}>{egoLabels[e.name]}</span>
                <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{e.pct}%</span>
              </div>
              <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${e.pct}%`, background: egoDotColors[e.name], transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top flags */}
        <div className="chart-card">
          <div className="chart-card-header"><div className="chart-card-title">Top coaching flags</div></div>
          {flags.slice(0, 5).map(f => (
            <div key={f.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '0.78rem' }}>
              <div className={`flag-sev sev-${f.severity}`} />
              <span className={`flag-fw fw-${f.framework.toLowerCase()}`}>{f.framework}</span>
              <span style={{ color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.trigger}</span>
            </div>
          ))}
          {flags.length === 0 && <div style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>No flags detected.</div>}
        </div>
      </div>

      {/* Stroke ratio */}
      <div className="summary-card">
        <div className="summary-row"><span className="summary-key">Your positive strokes</span><span className="summary-val" style={{color:'var(--green)'}}>{strokes.selfPositive}</span></div>
        <div className="summary-row"><span className="summary-key">Your negative strokes</span><span className="summary-val" style={{color:'var(--coral)'}}>{strokes.selfNegative}</span></div>
        <div className="summary-row"><span className="summary-key">Gottman ratio (5:1 target)</span><span className="summary-val">{strokes.selfNegative > 0 ? (strokes.selfPositive / strokes.selfNegative).toFixed(1) + ':1' : '—'}</span></div>
        <div className="summary-row"><span className="summary-key">Psychological games detected</span><span className="summary-val">{games.length}</span></div>
      </div>
    </div>
  );
}

// ── Sentiment view ─────────────────────────────
function ViewSentiment({ days, selfName, otherName }) {
  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Sentiment</span>
        <span className="section-subtitle">Daily average tone</span>
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Sentiment dual track</div>
          <div className="chart-card-note">Values above 0 = warmer · below 0 = critical or withdrawn</div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradSelf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5cbfaa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#5cbfaa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOther" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9b7fd4" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#9b7fd4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
            <Area type="monotone" dataKey="selfSentiment" name="You" stroke="#5cbfaa" fill="url(#gradSelf)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="otherSentiment" name="Them" stroke="#9b7fd4" fill="url(#gradOther)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <div className="chart-card-header"><div className="chart-card-title">Message volume by day</div></div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="selfCount" name="You" stackId="a" fill="#5cbfaa" opacity={0.8} />
            <Bar dataKey="otherCount" name="Them" stackId="a" fill="#9b7fd4" opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Power view ─────────────────────────────────
function ViewPower({ days, selfName }) {
  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Power & intensity</span>
        <span className="section-subtitle">Control language and emotional heat</span>
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Power language over time</div>
          <div className="chart-card-note">High = more controlling, critical, or ultimatum-driven language</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0.25} stroke="rgba(212,163,92,0.3)" strokeDasharray="4 2" label={{ value: 'flag threshold', position: 'right', fontSize: 9, fill: '#d4a35c' }} />
            <Line type="monotone" dataKey="selfPower" name="Power" stroke="#d97062" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="selfIntensity" name="Intensity" stroke="#d4a35c" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <div className="chart-card-header"><div className="chart-card-title">Four Horsemen by day</div></div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="horsemen.criticism" name="Criticism" stackId="h" fill="#d97062" />
            <Bar dataKey="horsemen.contempt" name="Contempt" stackId="h" fill="#9b7fd4" />
            <Bar dataKey="horsemen.defensiveness" name="Defensiveness" stackId="h" fill="#d4a35c" />
            <Bar dataKey="horsemen.stonewalling" name="Stonewalling" stackId="h" fill="#5e5c58" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Flags view ─────────────────────────────────
function FlagItem({ flag }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const d = new Date(flag.ts);
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className={`flag-item ${open ? 'expanded' : ''}`}>
      <div className="flag-header" onClick={() => setOpen(!open)}>
        <div className={`flag-sev sev-${flag.severity}`} />
        <span className={`flag-fw fw-${flag.framework.toLowerCase()}`}>{flag.framework}</span>
        <span className="flag-trigger">{flag.trigger}</span>
        <span className="flag-date">{dateStr}</span>
        <span style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="flag-body">
          <div className="flag-cue">{flag.cue}</div>
          <div className="flag-guidance">{flag.guidance}</div>
          <div className="flag-note-area">
            <div className="flag-note-label">Your reflection (saved locally)</div>
            <textarea
              className="flag-note-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What was happening for you at this point? What might you do differently?"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ViewFlags({ flags }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? flags : flags.filter(f =>
    filter === 'act' ? f.severity === 'act' :
    filter === 'watch' ? f.severity === 'watch' :
    f.framework.toLowerCase() === filter
  );

  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Coaching flags</span>
        <span className="section-subtitle">{flags.length} total · {flags.filter(f=>f.severity==='act').length} action</span>
      </div>
      <div className="tabs-row">
        {['all','act','watch','gottman','dbt','ta','attachment'].map(t => (
          <button key={t} className={`tab-btn ${filter===t?'active':''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? `All (${flags.length})` : t}
          </button>
        ))}
      </div>
      <div className="flags-list">
        {filtered.length === 0 && (
          <div className="empty-state"><p>No flags in this filter.</p></div>
        )}
        {filtered.map(f => <FlagItem key={f.id} flag={f} />)}
      </div>
    </div>
  );
}

// ── TA Ego States view ─────────────────────────
const egoLabels = { CP: 'Critical Parent', NP: 'Nurturing Parent', A: 'Adult', AC: 'Adapted Child', FC: 'Free Child' };
const egoDotColors = { CP: '#d97062', NP: '#7ab87a', A: '#c8b97a', AC: '#9b7fd4', FC: '#5cbfaa' };
const egoDescriptions = {
  CP: 'Judging, controlling, critical, rule-giving language. Triggers Adapted Child in the other person.',
  NP: 'Caring, supportive, protective language. Can tip into over-rescuing or smothering.',
  A: 'Rational, fact-based, negotiating language. The most stable base for conflict resolution.',
  AC: 'Pleasing, deferring, over-apologising, or rebellious language. Often reactive to a Parent stimulus.',
  FC: 'Spontaneous, playful, expressive, emotionally direct language. Creative and energising when safe.',
};

function ViewTA({ days, egoTotals }) {
  const total = Object.values(egoTotals).reduce((a, b) => a + b, 0);
  const egoChartData = days.map(d => ({
    dateKey: d.dateKey,
    ts: d.ts,
    ...d.egoStates
  }));

  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Ego states</span>
        <span className="section-subtitle">Transactional Analysis · your messages only</span>
      </div>
      <div className="ego-legend">
        {Object.entries(egoLabels).map(([k, v]) => (
          <div key={k} className="ego-badge">
            <div className={`ego-dot ego-${k}`} style={{ background: egoDotColors[k] }} />
            <span><strong style={{ color: 'var(--text)' }}>{k}</strong> — {v}</span>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Ego state distribution over time</div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={egoChartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            {Object.keys(egoLabels).map(k => (
              <Area key={k} type="monotone" dataKey={k} name={k} stackId="1" stroke={egoDotColors[k]} fill={egoDotColors[k]} fillOpacity={0.4} dot={false} strokeWidth={1} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <div className="chart-card-header"><div className="chart-card-title">Overall split</div></div>
        {Object.entries(egoTotals).map(([k, v]) => {
          const pct = total ? Math.round(v / total * 100) : 0;
          return (
            <div key={k} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: egoDotColors[k], fontFamily: 'var(--font-mono)' }}>{k} — {egoLabels[k]}</span>
                <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
              </div>
              <div style={{ height: '5px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: egoDotColors[k], transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '3px' }}>{egoDescriptions[k]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Drama Triangle view ────────────────────────
function ViewDrama({ dramaInstances }) {
  const roleColors = { Persecutor: 'role-persecutor', Rescuer: 'role-rescuer', Victim: 'role-victim' };

  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Drama Triangle</span>
        <span className="section-subtitle">Karpman · {dramaInstances.length} instances detected</span>
      </div>
      <div className="summary-card" style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: '1.65' }}>
          The Drama Triangle (Karpman, 1968) maps three co-dependent roles: <span style={{ color: 'var(--coral)' }}>Persecutor</span> (blaming, controlling), <span style={{ color: 'var(--green)' }}>Rescuer</span> (over-helping, enabling), and <span style={{ color: 'var(--purple)' }}>Victim</span> (helpless, blame-deflecting). Roles rotate — the same person can move from Victim to Persecutor within a single conversation. The triangle sustains itself because each role provides a psychological payoff. The exit is Adult-to-Adult contact.
        </p>
      </div>
      {dramaInstances.length === 0 && (
        <div className="empty-state"><p>No Drama Triangle patterns detected in this dataset.</p></div>
      )}
      {dramaInstances.map((r, i) => {
        const d = new Date(r.ts);
        const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return (
          <div key={i} className="drama-row">
            <span className={`drama-role ${roleColors[r.role]}`}>{r.role}</span>
            <span className="drama-desc">{r.text}{r.text.length >= 80 ? '…' : ''}</span>
            <span className="drama-date">{dateStr}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stroke economy ─────────────────────────────
function ViewStrokes({ strokes, days, selfName, otherName }) {
  const selfTotal = strokes.selfPositive + strokes.selfNegative;
  const otherTotal = strokes.otherPositive + strokes.otherNegative;
  const gottmanRatio = strokes.selfNegative > 0 ? (strokes.selfPositive / strokes.selfNegative).toFixed(1) : '∞';

  const strokeData = days.map(d => ({
    dateKey: d.dateKey,
    ts: d.ts,
    selfPositive: d.selfStrokes?.positive || 0,
    selfNegative: d.selfStrokes?.negative || 0,
  }));

  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Stroke economy</span>
        <span className="section-subtitle">TA · positive vs negative transactions</span>
      </div>
      <div className="summary-card" style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: '1.65', marginBottom: '10px' }}>
          In TA, a <em style={{ color: 'var(--accent)' }}>stroke</em> is any unit of recognition — positive (warmth, praise, appreciation) or negative (criticism, contempt, withdrawal). Gottman's research identifies a <strong style={{ color: 'var(--text)' }}>5:1 positive-to-negative ratio</strong> as the threshold for relationship stability. Below that, the relationship is in deficit.
        </p>
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.82rem' }}>
          <span>Your ratio: <strong style={{ color: parseFloat(gottmanRatio) >= 5 ? 'var(--green)' : parseFloat(gottmanRatio) >= 3 ? 'var(--amber)' : 'var(--coral)' }}>{gottmanRatio}:1</strong></span>
          <span style={{ color: 'var(--text3)' }}>Target: 5:1</span>
        </div>
      </div>

      {['selfPositive', 'selfNegative', 'otherPositive', 'otherNegative'].map((key, i) => {
        const val = strokes[key];
        const total = key.startsWith('self') ? selfTotal : otherTotal;
        const pct = total ? Math.round(val / total * 100) : 0;
        const isPos = key.includes('Positive');
        const label = (key.startsWith('self') ? 'You' : 'Them') + ' — ' + (isPos ? 'positive strokes' : 'negative strokes');
        return (
          <div key={key} className="stroke-bar-wrap">
            <span className="stroke-bar-label">{label}</span>
            <div className="stroke-bar-track">
              <div className={`stroke-bar-fill ${isPos ? 'stroke-positive' : 'stroke-negative'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="stroke-bar-val">{val}</span>
          </div>
        );
      })}

      <div className="chart-card" style={{ marginTop: '16px' }}>
        <div className="chart-card-header"><div className="chart-card-title">Daily stroke pattern</div></div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={strokeData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="selfPositive" name="Positive" fill="#7ab87a" opacity={0.85} />
            <Bar dataKey="selfNegative" name="Negative" fill="#d97062" opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Psychological games ────────────────────────
function ViewGames({ games }) {
  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Psychological games</span>
        <span className="section-subtitle">TA · {games.length} detected</span>
      </div>
      <div className="summary-card" style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: '1.65' }}>
          In TA, a <em style={{ color: 'var(--accent)' }}>psychological game</em> (Berne, 1964) is a recurring pattern of transactions that feel familiar but end in a negative payoff — confirming an internal script about self, others, or the world. Games operate outside awareness. Naming them is the beginning of exit.
        </p>
      </div>
      {games.length === 0 && (
        <div className="empty-state"><p>No significant game patterns detected in this dataset.</p></div>
      )}
      {games.map((g, i) => (
        <div key={i} className="games-item">
          <div className="games-name">{g.name} — {g.fullName}</div>
          <div className="games-pattern" style={{ fontSize: '0.75rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
            Pattern: {g.pattern}
          </div>
          <div className="games-desc">{g.description}</div>
          <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            {g.instances} instance{g.instances !== 1 ? 's' : ''} detected
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reply latency ──────────────────────────────
function ViewLatency({ days, selfName, otherName }) {
  return (
    <div className="fade-in">
      <div className="section-header">
        <span className="section-title">Reply latency</span>
        <span className="section-subtitle">How long before each person replies</span>
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Average reply delay per day</div>
          <div className="chart-card-note">Lower = faster replies. Spikes may signal avoidance or busyness.</div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tickFormatter={v => v < 60 ? `${v}m` : `${(v/60).toFixed(0)}h`} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="selfReplyDelayMin" name="You (min)" stroke="#5cbfaa" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="otherReplyDelayMin" name="Them (min)" stroke="#9b7fd4" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Rapid follow-ups by day</div>
          <div className="chart-card-note">Messages sent before the other person replies</div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dateKey" tickFormatter={formatDateKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="interruptionCount" name="Follow-ups" fill="#d97062" opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
