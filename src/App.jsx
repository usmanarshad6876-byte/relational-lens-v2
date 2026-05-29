import React, { useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from 'recharts';
import {
  parseWhatsApp, generateDemo, enrichMessages, detectRegimes,
  aggregateDaily, computeKPIs, computeTAStats, generateFlags,
  buildRegimeSegments, REGIME_COLORS, EGO_COLORS, EGO_LABELS
} from './analyse.js';

const fmtDelay = m => m < 60 ? `${Math.round(m)}m` : `${(m/60).toFixed(1)}h`;
const fmtPct = v => `${Math.round(v * 100)}%`;
const fmtNum = n => Number.isFinite(n) ? (n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(Math.round(n))) : '—';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tt-row">
          <div className="tt-dot" style={{ background: p.color }} />
          <span style={{ color: '#9494a0' }}>{p.name}:</span>
          <span style={{ color: '#e8e8ec', marginLeft: 4 }}>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function FlagItem({ flag }) {
  const [open, setOpen] = useState(false);
  const borderColor = flag.severity === 'good' ? 'rgba(94,201,138,0.3)' : flag.severity === 'act' ? 'rgba(245,96,96,0.2)' : undefined;
  return (
    <div className="flag-item" style={borderColor ? { border: `1px solid ${borderColor}` } : {}}>
      <div className="flag-header" onClick={() => setOpen(!open)}>
        <span className={`flag-framework ${flag.framework}`}>{flag.framework.toUpperCase()}</span>
        <span className="flag-trigger">{flag.trigger}</span>
        <span className={`flag-chevron${open ? ' open' : ''}`}>▾</span>
      </div>
      {open && (
        <div className="flag-body">
          <div className="flag-cue">{flag.cue}</div>
          <div className="flag-guidance">{flag.guidance}</div>
          <div className="flag-ts">{flag.ts.toISOString().slice(0,10)}</div>
        </div>
      )}
    </div>
  );
}

function TAPanel({ taStats, kpis }) {
  const egoOrder = ['CP','NP','A','AC','FC'];
  const selfTotal = Object.values(kpis.selfEgoCounts).reduce((a,b)=>a+b,0) || 1;
  const otherTotal = Object.values(kpis.otherEgoCounts).reduce((a,b)=>a+b,0) || 1;
  return (
    <div>
      <div className="ta-section">
        <div className="ta-section-title">Ego states — Self</div>
        <div className="ego-bar">
          {egoOrder.map(e => { const pct=((kpis.selfEgoCounts[e]||0)/selfTotal)*100; return pct>1 ? <div key={e} className="ego-segment" style={{width:`${pct}%`,background:EGO_COLORS[e]}} title={EGO_LABELS[e]} /> : null; })}
        </div>
        <div className="ego-legend">
          {egoOrder.map(e => { const pct=Math.round(((kpis.selfEgoCounts[e]||0)/selfTotal)*100); return pct>0 ? (<div key={e} className="ego-legend-item"><div className="ego-dot" style={{background:EGO_COLORS[e]}} /><span>{EGO_LABELS[e]} {pct}%</span></div>) : null; })}
        </div>
      </div>

      <div className="ta-section">
        <div className="ta-section-title">Ego states — Other</div>
        <div className="ego-bar">
          {egoOrder.map(e => { const pct=((kpis.otherEgoCounts[e]||0)/otherTotal)*100; return pct>1 ? <div key={e} className="ego-segment" style={{width:`${pct}%`,background:EGO_COLORS[e]}} title={EGO_LABELS[e]} /> : null; })}
        </div>
        <div className="ego-legend">
          {egoOrder.map(e => { const pct=Math.round(((kpis.otherEgoCounts[e]||0)/otherTotal)*100); return pct>0 ? (<div key={e} className="ego-legend-item"><div className="ego-dot" style={{background:EGO_COLORS[e]}} /><span>{EGO_LABELS[e]} {pct}%</span></div>) : null; })}
        </div>
      </div>

      <div className="ta-section">
        <div className="ta-section-title">Drama Triangle — Self</div>
        <div className="drama-row">
          {Object.entries(taStats.dramaSelf).map(([role,pct]) => {
            const col = role==='Persecutor'?'#f56060':role==='Rescuer'?'#5ec98a':'#f5c842';
            return (<div key={role} className="drama-card"><div className="drama-label">{role}</div><div className="drama-value" style={{color:col}}>{pct}%</div></div>);
          })}
        </div>
        <div style={{fontSize:11,color:'var(--text3)',lineHeight:1.5}}>CP→Persecutor, NP→Rescuer, AC→Victim mapping. High swing between Persecutor and Victim signals Drama Triangle activation.</div>
      </div>

      <div className="ta-section">
        <div className="ta-section-title">Stroke economy — Self</div>
        {[{label:'+ strokes',val:taStats.selfPos,color:'#5ec98a'},{label:'− strokes',val:taStats.selfNeg,color:'#f56060'},{label:'Conditional',val:taStats.selfCond,color:'#f5c842'}].map(({label,val,color}) => {
          const total = taStats.selfPos+taStats.selfNeg+taStats.selfCond||1;
          return (<div key={label} className="stroke-row"><div className="stroke-name">{label}</div><div className="stroke-track"><div className="stroke-fill" style={{width:`${(val/total)*100}%`,background:color}} /></div><div className="stroke-pct">{Math.round((val/total)*100)}%</div></div>);
        })}
      </div>

      {taStats.games.length > 0 && (
        <div className="ta-section">
          <div className="ta-section-title">Psychological games</div>
          {taStats.games.map((g,i) => (<div key={i} className="game-item"><div className="game-name">{g.name}</div><div className="game-desc">{g.desc}</div></div>))}
        </div>
      )}

      <div className="ta-section">
        <div className="ta-section-title">Four Horsemen (Gottman)</div>
        <div className="horsemen-grid">
          {[{key:'criticism',label:'Criticism',color:'#f56060',antidote:"'When X, I feel Y' — not 'You are Z'"},{key:'contempt',label:'Contempt',color:'#f59e61',antidote:'Appreciation culture first'},{key:'defensiveness',label:'Defensiveness',color:'#f5c842',antidote:'Own even 5% of it'},{key:'stonewalling',label:'Stonewalling',color:'#60b4f5',antidote:'20 min self-soothe, then return'}].map(({key,label,color,antidote}) => {
            const val=kpis.horsemen[key]||0; const mx=Math.max(...Object.values(kpis.horsemen))||1;
            return (<div key={key} className="horseman-card"><div className="horseman-name">{label}</div><div className="horseman-bar-track"><div className="horseman-bar-fill" style={{width:`${(val/mx)*100}%`,background:color}} /></div><div className="horseman-val">{val} instances</div><div className="horseman-antidote">{antidote}</div></div>);
          })}
        </div>
      </div>
    </div>
  );
}

function UploadScreen({ onLoad }) {
  const [drag, setDrag] = useState(false);
  const [selfName, setSelfName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [error, setError] = useState('');

  const process = useCallback((text) => {
    if (!selfName.trim() || !otherName.trim()) { setError('Enter both names first.'); return; }
    const msgs = parseWhatsApp(text, selfName.trim(), otherName.trim());
    if (msgs.length < 10) { setError('Fewer than 10 parseable messages. Check names match the chat exactly.'); return; }
    setError('');
    onLoad({ msgs, selfName: selfName.trim(), otherName: otherName.trim() });
  }, [selfName, otherName, onLoad]);

  const handleFile = useCallback(file => {
    const r = new FileReader(); r.onload = e => process(e.target.result); r.readAsText(file);
  }, [process]);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const loadDemo = useCallback(() => {
    const s = selfName.trim() || 'Usman'; const o = otherName.trim() || 'Aira';
    onLoad({ msgs: generateDemo(s, o), selfName: s, otherName: o, isDemo: true });
  }, [selfName, otherName, onLoad]);

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <h1>Relational Lens <span>v2</span></h1>
        <p>Conversation analytics through Transactional Analysis, Gottman Method, DBT, and Attachment Theory. Upload a WhatsApp export or load the demo.</p>
      </div>

      <div className="setup-card">
        <h3>Participants</h3>
        <div className="setup-row">
          <div className="setup-field">
            <label>Your name (as it appears in chat)</label>
            <input value={selfName} onChange={e=>setSelfName(e.target.value)} placeholder="e.g. Usman" />
          </div>
          <div className="setup-field">
            <label>Other person's name</label>
            <input value={otherName} onChange={e=>setOtherName(e.target.value)} placeholder="e.g. Aira" />
          </div>
        </div>
      </div>

      <div className={`upload-zone${drag?' drag-over':''}`}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={onDrop}
        onClick={()=>{const i=document.createElement('input');i.type='file';i.accept='.txt';i.onchange=e=>handleFile(e.target.files[0]);i.click();}}>
        <div className="upload-zone-icon">📂</div>
        <h3>Drop WhatsApp .txt export</h3>
        <p>or click to browse</p>
        <div className="upload-formats">WhatsApp → ⋮ → More → Export Chat → Without Media</div>
      </div>

      {error && <div style={{color:'var(--red)',fontSize:12,fontFamily:'var(--mono)'}}>{error}</div>}
      <button className="demo-link" onClick={loadDemo}>or load synthetic demo data →</button>
    </div>
  );
}

function Dashboard({ data, onReset }) {
  const [chartTab, setChartTab] = useState('frequency');
  const [rightTab, setRightTab] = useState('ta');
  const { msgs: rawMsgs, selfName, otherName, isDemo } = data;

  const enriched = useMemo(()=>enrichMessages(detectRegimes(rawMsgs)),[rawMsgs]);
  const days = useMemo(()=>aggregateDaily(enriched),[enriched]);
  const kpis = useMemo(()=>computeKPIs(enriched),[enriched]);
  const taStats = useMemo(()=>computeTAStats(enriched),[enriched]);
  const flags = useMemo(()=>generateFlags(days,enriched,kpis),[days,enriched,kpis]);
  const regimeSegs = useMemo(()=>buildRegimeSegments(enriched),[enriched]);

  const chartData = days.map(d=>({
    label: d.label,
    'Self': d.selfCount,
    'Other': d.otherCount,
    'Self sentiment': parseFloat(d.selfSentimentAvg.toFixed(2)),
    'Other sentiment': parseFloat(d.otherSentimentAvg.toFixed(2)),
    'Self power': parseFloat((d.selfCount?d.selfPower/d.selfCount:0).toFixed(2)),
    'Other power': parseFloat((d.otherCount?d.otherPower/d.otherCount:0).toFixed(2)),
    'Latency (min)': d.avgReplyLatencyMin ? parseFloat(d.avgReplyLatencyMin.toFixed(1)) : null,
  }));

  const CHART_TABS = [{id:'frequency',label:'Frequency'},{id:'sentiment',label:'Sentiment'},{id:'power',label:'Power'},{id:'latency',label:'Latency'}];
  const RIGHT_TABS = [{id:'ta',label:'TA + Horsemen'},{id:'flags',label:`Flags (${flags.length})`}];
  const tickInterval = Math.max(1, Math.floor(chartData.length/12));

  return (
    <div className="dashboard">
      <div className="convo-strip">
        <div className="convo-names">
          <div className="name-pill self">{selfName}</div>
          <span style={{color:'var(--text3)',fontSize:12}}>↔</span>
          <div className="name-pill other">{otherName}</div>
          {isDemo && <span className="badge warn">demo</span>}
        </div>
        <div className="convo-meta">
          <div className="meta-item"><div className="meta-label">messages</div><div className="meta-value">{kpis.totalMsgs.toLocaleString()}</div></div>
          <div className="meta-item"><div className="meta-label">range</div><div className="meta-value">{kpis.dateRange}</div></div>
          <div className="meta-item"><div className="meta-label">days</div><div className="meta-value">{days.length}</div></div>
        </div>
        <button className="btn btn-ghost" style={{fontSize:12,padding:'5px 12px'}} onClick={onReset}>↩ New</button>
      </div>

      <div className="regime-bar-wrap">
        <div className="regime-bar-label">Conversation arc</div>
        <div className="regime-bar">
          {regimeSegs.map((s,i)=>(
            <div key={i} className="regime-segment" style={{width:`${s.pct}%`,background:REGIME_COLORS[s.regime],minWidth:2}} title={`${s.regime} — ${s.count} messages`} />
          ))}
        </div>
        <div className="regime-legend">
          {Object.entries(REGIME_COLORS).map(([r,c])=>(<div key={r} className="regime-legend-item"><div className="regime-dot" style={{background:c}} /><span>{r}</span></div>))}
        </div>
      </div>

      <div className="kpi-grid">
        {[
          {label:'Self share',value:fmtPct(kpis.selfShare),hint:'of all messages',flag:kpis.selfShare>0.6?{t:'⚠ Skewed',c:'bad'}:kpis.selfShare>0.55?{t:'~ Tilted',c:'warn'}:{t:'✓ Balanced',c:'neutral'}},
          {label:'Avg reply delay',value:kpis.avgSelfLatency>0?fmtDelay(kpis.avgSelfLatency):'—',hint:`Other: ${kpis.avgOtherLatency>0?fmtDelay(kpis.avgOtherLatency):'—'}`,flag:kpis.avgSelfLatency<kpis.avgOtherLatency/2?{t:'⚠ Hyperactive',c:'bad'}:{t:'✓ Steady',c:'neutral'}},
          {label:'Avg sentiment',value:kpis.avgSelfSentiment.toFixed(2),hint:'−1 rupture → +1 warm',valueColor:kpis.avgSelfSentiment>0.1?'var(--green)':kpis.avgSelfSentiment<-0.1?'var(--red)':undefined,flag:kpis.avgSelfSentiment>0.1?{t:'✓ Net warm',c:'good'}:kpis.avgSelfSentiment<-0.1?{t:'⚠ Net tense',c:'bad'}:{t:'~ Mixed',c:'neutral'}},
          {label:'Interruptions',value:fmtNum(kpis.selfInterrupts),hint:'rapid self-follow-ups',flag:kpis.selfInterrupts>kpis.selfCount*0.08?{t:'⚠ Floor-holding',c:'bad'}:{t:'✓ Contained',c:'neutral'}},
          {label:'Repair attempts',value:fmtNum(kpis.selfRepairs),hint:`Other: ${kpis.otherRepairs}`,valueColor:'var(--green)',flag:{t:'✓ Stability currency',c:'good'}},
          {label:'CP ego state',value:`${Math.round(((kpis.selfEgoCounts.CP||0)/Math.max(1,kpis.selfCount))*100)}%`,hint:'Critical Parent (Self)',valueColor:EGO_COLORS.CP,flag:(kpis.selfEgoCounts.CP||0)/Math.max(1,kpis.selfCount)>0.15?{t:'⚠ Elevated',c:'bad'}:{t:'✓ Low',c:'neutral'}},
        ].map(({label,value,hint,flag,valueColor})=>(
          <div key={label} className="kpi-card">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={valueColor?{color:valueColor}:{}}>{value}</div>
            <div className="kpi-hint">{hint}</div>
            <div className={`kpi-flag ${flag.c}`}>{flag.t}</div>
          </div>
        ))}
      </div>

      <div className="main-grid">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Timeline</span>
            <div className="tab-nav">
              {CHART_TABS.map(t=><button key={t.id} className={`tab-btn${chartTab===t.id?' active':''}`} onClick={()=>setChartTab(t.id)}>{t.label}</button>)}
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                {chartTab==='frequency' ? (
                  <AreaChart data={chartData} margin={{top:8,right:8,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9d8fff" stopOpacity={0.4}/><stop offset="100%" stopColor="#9d8fff" stopOpacity={0.02}/></linearGradient>
                      <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60b4f5" stopOpacity={0.3}/><stop offset="100%" stopColor="#60b4f5" stopOpacity={0.02}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} interval={tickInterval}/>
                    <YAxis tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Area type="monotone" dataKey="Self" stroke="#9d8fff" strokeWidth={1.5} fill="url(#gS)" dot={false}/>
                    <Area type="monotone" dataKey="Other" stroke="#60b4f5" strokeWidth={1.5} fill="url(#gO)" dot={false}/>
                  </AreaChart>
                ) : chartTab==='sentiment' ? (
                  <LineChart data={chartData} margin={{top:8,right:8,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} interval={tickInterval}/>
                    <YAxis domain={[-1,1]} tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)"/>
                    <Line type="monotone" dataKey="Self sentiment" stroke="#9d8fff" strokeWidth={1.5} dot={false}/>
                    <Line type="monotone" dataKey="Other sentiment" stroke="#60b4f5" strokeWidth={1.5} dot={false}/>
                  </LineChart>
                ) : chartTab==='power' ? (
                  <LineChart data={chartData} margin={{top:8,right:8,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} interval={tickInterval}/>
                    <YAxis domain={[0,1]} tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Line type="monotone" dataKey="Self power" stroke="#f56060" strokeWidth={1.5} dot={false}/>
                    <Line type="monotone" dataKey="Other power" stroke="#f5c842" strokeWidth={1.5} dot={false}/>
                  </LineChart>
                ) : (
                  <AreaChart data={chartData.filter(d=>d['Latency (min)']!==null)} margin={{top:8,right:8,left:-20,bottom:0}}>
                    <defs><linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#42c8b8" stopOpacity={0.3}/><stop offset="100%" stopColor="#42c8b8" stopOpacity={0.02}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} interval={tickInterval}/>
                    <YAxis tick={{fontSize:10,fill:'#5a5a66'}} axisLine={false} tickLine={false} width={32}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Area type="monotone" dataKey="Latency (min)" stroke="#42c8b8" strokeWidth={1.5} fill="url(#gL)" dot={false}/>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            <div style={{marginTop:14,borderTop:'1px solid var(--border)',paddingTop:12}}>
              <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Recent messages — ego state pip colour</div>
              <div className="convo-view">
                {enriched.slice(-28).map((m,i)=>(
                  <div key={i} className={`msg-row${m.sender==='Self'?' self':''}`}>
                    <div className="msg-ego-pip" style={{background:EGO_COLORS[m.ego]}} title={EGO_LABELS[m.ego]}/>
                    <div>
                      <div className={`msg-bubble${m.sender==='Self'?' self':' other'}`}>{m.content}</div>
                      <div className="msg-meta">
                        {m.ts.toISOString().slice(11,16)} · {EGO_LABELS[m.ego]}
                        {m.repair?' · 🔧':''}{m.power?' · ⚡':''}{m.interrupt?' · ⚠':''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Analysis</span>
            <div className="tab-nav">
              {RIGHT_TABS.map(t=><button key={t.id} className={`tab-btn${rightTab===t.id?' active':''}`} onClick={()=>setRightTab(t.id)}>{t.label}</button>)}
            </div>
          </div>
          <div className="panel-body" style={{maxHeight:740,overflowY:'auto'}}>
            {rightTab==='ta' ? (
              <TAPanel taStats={taStats} kpis={kpis}/>
            ) : (
              <div className="flags-list">
                {flags.length===0 ? <div className="empty">No flags generated.</div> : flags.map(f=><FlagItem key={f.id} flag={f}/>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)',textAlign:'center',paddingBottom:14}}>
        Relational Lens v2 · TA + Gottman + DBT + Attachment · built for reflection, not diagnosis
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">🔍</div>
          <div>
            <div className="header-title">Relational Lens</div>
            <div className="header-sub">conversation analytics</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="badge purple">v2</span>
          {data && <span className="badge live">live</span>}
        </div>
      </header>
      {data ? <Dashboard data={data} onReset={()=>setData(null)}/> : <UploadScreen onLoad={setData}/>}
    </div>
  );
}
