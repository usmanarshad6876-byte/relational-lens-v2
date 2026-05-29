// ─── WhatsApp Parser ───────────────────────────────────────────────────────
export function parseWhatsApp(text, selfName, otherName) {
  // Patterns: [DD/MM/YYYY, HH:MM] or [DD/MM/YY, HH:MM:SS] or 12hr variants
  const lineRe = /^\[?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s*[-–]\s*(.+?):\s*(.+)$/;
  const msgs = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const m = line.match(lineRe);
    if (!m) continue;
    const [, datePart, timePart, sender, content] = m;
    if (content.trim() === '<Media omitted>' || content.trim() === 'image omitted') continue;
    const parts = datePart.split(/[\/\.\-]/);
    let d, mo, y;
    if (parseInt(parts[2]) > 31) { [d, mo, y] = parts; } // DD/MM/YY
    else { [mo, d, y] = parts; } // US style MM/DD/YY
    y = y.length === 2 ? '20' + y : y;
    const ts = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${to24(timePart)}`);
    if (isNaN(ts)) continue;
    const normSender = normaliseName(sender, selfName, otherName);
    msgs.push({ ts, sender: normSender, raw: sender, content: content.trim() });
  }
  return msgs.sort((a, b) => a.ts - b.ts);
}

function to24(t) {
  t = t.trim();
  const ap = t.match(/(AM|PM)/i);
  if (!ap) return t.length === 5 ? t + ':00' : t;
  let [hm] = t.split(/\s?[AP]M/i);
  let [h, m, s = '00'] = hm.trim().split(':');
  h = parseInt(h);
  if (ap[0].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ap[0].toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${m}:${s}`;
}

function normaliseName(raw, self, other) {
  const r = raw.trim().toLowerCase();
  if (r.includes(self.toLowerCase())) return 'Self';
  if (r.includes(other.toLowerCase())) return 'Other';
  return raw.trim();
}

// ─── Demo data generator ──────────────────────────────────────────────────
const seed42 = (() => {
  let s = 42;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
})();
const rnd = (a, b) => a + seed42() * (b - a);
const pick = arr => arr[Math.floor(seed42() * arr.length)];

const MSGS = {
  warm: {
    Self: ["good morning, hope you slept ok", "thinking of you today", "made tea, wishing you were here", "you handled that meeting so well", "miss your laugh", "you're my favourite human you know that?"],
    Other: ["morning!", "miss you too", "tea sounds perfect", "you're sweet", "ok now I'm smiling at my desk", "you're the best part of my day"]
  },
  neutral: {
    Self: ["did you eat?", "what time are you free tonight?", "should I pick something up?", "ok cool sounds good", "let me know when free"],
    Other: ["yes just had soup", "around 8 maybe", "if it's not a hassle sure", "ok", "in a meeting brb", "sorry just seeing this"]
  },
  tense: {
    Self: ["you've been quiet today everything ok?", "you saw my message 2 hours ago", "is there a reason you're not replying", "I just want to know if you're upset with me", "I'm trying not to overthink but it's hard", "are we ok?"],
    Other: ["I'm just tired not upset", "can we talk about this later I'm at work", "I don't have the bandwidth right now", "please don't read into the silence", "I need a bit of space not a fight"]
  },
  rupture: {
    Self: ["this is exactly what I mean. you always disappear when it gets hard", "you never actually answer me you just deflect", "I'm always the one chasing, do you even notice that", "fine. forget it.", "if you wanted to make time you would", "I can't keep being the only one trying here"],
    Other: ["this is a lot first thing in the morning", "I haven't even had a chance to reply and you've sent six messages", "I'm not deflecting, I'm working", "I love you but this is exhausting", "I need you to stop for a second", "that's not what I said"]
  },
  repair: {
    Self: ["ok I shouldn't have said that, sorry", "I was anxious, that's on me. can we restart?", "I love you. I'm sorry I got reactive", "let's not do this over text, can we talk tonight?", "you're right that I escalated. I'm working on it"],
    Other: ["I know. I'm sorry too", "yes please let's reset", "I love you too. I just need some gentleness right now", "ok. call me tonight?", "thank you for saying that"]
  }
};

export function generateDemo(selfName = 'Usman', otherName = 'Aira') {
  const regimes = [
    { regime: 'warm', weeks: 0.7 },
    { regime: 'neutral', weeks: 1 },
    { regime: 'tense', weeks: 1 },
    { regime: 'rupture', weeks: 0.8 },
    { regime: 'repair', weeks: 0.5 },
    { regime: 'neutral', weeks: 1 },
    { regime: 'tense', weeks: 1 },
    { regime: 'rupture', weeks: 1 },
    { regime: 'repair', weeks: 1.5 },
    { regime: 'warm', weeks: 1.3 }
  ];
  const msgs = [];
  let t = new Date('2024-09-02T09:00:00');
  for (const { regime, weeks } of regimes) {
    const count = Math.round({ warm: 24, neutral: 14, tense: 36, rupture: 60, repair: 32 }[regime] * rnd(0.7, 1.3));
    const selfShare = { warm: 0.45, neutral: 0.5, tense: 0.62, rupture: 0.72, repair: 0.55 }[regime];
    for (let i = 0; i < count; i++) {
      t = new Date(t.getTime() + rnd(3, 90) * 60000);
      const isSelf = seed42() < selfShare;
      const sender = isSelf ? 'Self' : 'Other';
      msgs.push({ ts: new Date(t), sender, content: pick(MSGS[regime][sender]), regime });
    }
    t = new Date(t.getTime() + weeks * 7 * 86400000);
  }
  return msgs;
}

// ─── Transactional Analysis Classifier ───────────────────────────────────
const TA_RULES = {
  CP: [/\b(you always|you never|you should|stop it|don't|must|have to|ridiculous|typical|again)\b/i,
       /\b(why can't you|is there a reason|what's wrong with you|you're being)\b/i],
  NP: [/\b(are you ok|hope you|take care|rest|let me help|miss you|proud of you|love you)\b/i,
       /\b(you handled|you did so well|I'm here|I've got you)\b/i],
  A:  [/\b(when|what time|should I|sounds good|ok|noted|let me know|I think|I believe|data shows)\b/i,
       /\b(the facts|based on|let's figure|that makes sense|I understand)\b/i],
  AC: [/\b(sorry|I'm sorry|I shouldn't|that's on me|forgive|please don't|I just want|I'm trying)\b/i,
       /\b(I feel|I'm scared|I'm anxious|I can't|I don't know|help|please)\b/i],
  FC: [/\b(miss you|haha|lol|excited|love|yay|so good|!!|morning|best|favourite)\b/i,
       /\b(thinking of you|wishing|made tea|pick something|let's)\b/i]
};

const EGO_COLORS = { CP: '#f56060', NP: '#5ec98a', A: '#60b4f5', AC: '#f5c842', FC: '#e060b0' };
const EGO_LABELS = { CP: 'Critical Parent', NP: 'Nurturing Parent', A: 'Adult', AC: 'Adapted Child', FC: 'Free Child' };

export function classifyEgo(text) {
  const scores = {};
  for (const [state, patterns] of Object.entries(TA_RULES)) {
    scores[state] = patterns.filter(p => p.test(text)).length;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  // Default to Adult if no signal
  return top[1] > 0 ? top[0] : 'A';
}

export { EGO_COLORS, EGO_LABELS };

// ─── Message Enrichment ────────────────────────────────────────────────────
const POWER_TOKENS = /\b(always|never|every time|you make me|if you don't|or else|fine|forget it|I'm done|typical|again|can't you|why can't|is that so hard)\b/i;
const REPAIR_TOKENS = /\b(sorry|I shouldn't|that's on me|I was wrong|forgive|let's restart|I love you|I hear you|you're right)\b/i;
const SENTIMENT_POS = /\b(love|miss|happy|good|great|thanks|thank|proud|smile|morning|best|favourite|excited|ok|sure|yes|please)\b/i;
const SENTIMENT_NEG = /\b(upset|angry|hurt|ignore|silent|leave|done|tired|exhausted|always|never|forget|fine|again|can't|nothing|wrong)\b/i;
const INTERRUPT_GAP = 3.5 * 60 * 1000; // 3.5 min in ms

export function enrichMessages(msgs) {
  const enriched = [];
  const lastBySender = {};
  const lastAny = {};
  for (let i = 0; i < msgs.length; i++) {
    const m = { ...msgs[i] };
    m.ego = classifyEgo(m.content);
    m.power = POWER_TOKENS.test(m.content) ? 1 : 0;
    m.repair = REPAIR_TOKENS.test(m.content) ? 1 : 0;
    const posHits = (m.content.match(SENTIMENT_POS) || []).length;
    const negHits = (m.content.match(SENTIMENT_NEG) || []).length;
    m.sentiment = Math.max(-1, Math.min(1, (posHits - negHits) / Math.max(1, posHits + negHits + 0.1)));

    // Horsemen
    m.horsemen = {
      criticism: /\b(you always|you never|you're so|why can't you|is there a reason you're|you make)\b/i.test(m.content) ? 1 : 0,
      contempt:  /\b(ridiculous|pathetic|what's wrong with you|grow up|i don't care|whatever)\b/i.test(m.content) ? 1 : 0,
      defensiveness: /\b(I was just|you're the one|it's not my fault|I didn't|stop blaming|that's not fair)\b/i.test(m.content) ? 1 : 0,
      stonewalling:  /\b(fine\.|forget it\.|I'm done\.|not talking|done with this|ok\.\s*$)\b/i.test(m.content) ? 1 : 0
    };

    // Reply latency
    const prev = lastAny[m.sender === 'Self' ? 'Other' : 'Self'];
    m.replyLatencyMs = prev ? m.ts - prev.ts : null;

    // Interruption (re-sent before reply)
    const ownPrev = lastBySender[m.sender];
    m.interrupt = ownPrev && (m.ts - ownPrev.ts) < INTERRUPT_GAP ? 1 : 0;

    lastBySender[m.sender] = m;
    lastAny[m.sender] = m;
    enriched.push(m);
  }
  return enriched;
}

// ─── Regime Detection ─────────────────────────────────────────────────────
export function detectRegimes(msgs) {
  // Window: 20 messages sliding, classify each
  const W = 20;
  const classified = [];
  for (let i = 0; i < msgs.length; i++) {
    const window = msgs.slice(Math.max(0, i - W), i + 1);
    const avgSentiment = window.reduce((s, m) => s + m.sentiment, 0) / window.length;
    const powerRatio = window.filter(m => m.power).length / window.length;
    const repairCount = window.filter(m => m.repair).length;
    let regime;
    if (repairCount >= 2) regime = 'repair';
    else if (powerRatio > 0.25 || avgSentiment < -0.35) regime = 'rupture';
    else if (powerRatio > 0.12 || avgSentiment < -0.1) regime = 'tense';
    else if (avgSentiment > 0.2) regime = 'warm';
    else regime = 'neutral';
    classified.push({ ...msgs[i], regime });
  }
  return classified;
}

export const REGIME_COLORS = {
  warm: '#5ec98a', neutral: '#60b4f5', tense: '#f5c842', rupture: '#f56060', repair: '#9d8fff'
};

// ─── Daily Aggregation ────────────────────────────────────────────────────
export function aggregateDaily(msgs) {
  const days = {};
  for (const m of msgs) {
    const dk = m.ts.toISOString().slice(0, 10);
    if (!days[dk]) days[dk] = {
      dateKey: dk, label: dk.slice(5).replace('-', '/'),
      ts: m.ts, selfCount: 0, otherCount: 0,
      selfSentiment: [], otherSentiment: [],
      selfPower: 0, otherPower: 0,
      selfRepair: 0, otherRepair: 0,
      selfEgo: {}, otherEgo: {},
      horsemen: { criticism: 0, contempt: 0, defensiveness: 0, stonewalling: 0 },
      selfInterrupt: 0,
      replyLatencies: []
    };
    const d = days[dk];
    if (m.sender === 'Self') {
      d.selfCount++;
      d.selfSentiment.push(m.sentiment);
      d.selfPower += m.power;
      d.selfRepair += m.repair;
      d.selfInterrupt += m.interrupt;
      d.selfEgo[m.ego] = (d.selfEgo[m.ego] || 0) + 1;
    } else {
      d.otherCount++;
      d.otherSentiment.push(m.sentiment);
      d.otherPower += m.power;
      d.otherRepair += m.repair;
      d.otherEgo[m.ego] = (d.otherEgo[m.ego] || 0) + 1;
    }
    for (const h of Object.keys(m.horsemen)) d.horsemen[h] += m.horsemen[h];
    if (m.replyLatencyMs !== null && m.replyLatencyMs > 0) d.replyLatencies.push(m.replyLatencyMs);
  }
  return Object.values(days).sort((a, b) => a.ts - b.ts).map(d => ({
    ...d,
    selfSentimentAvg: d.selfSentiment.length ? d.selfSentiment.reduce((a, b) => a + b, 0) / d.selfSentiment.length : 0,
    otherSentimentAvg: d.otherSentiment.length ? d.otherSentiment.reduce((a, b) => a + b, 0) / d.otherSentiment.length : 0,
    avgReplyLatencyMin: d.replyLatencies.length ? d.replyLatencies.reduce((a, b) => a + b, 0) / d.replyLatencies.length / 60000 : null,
    totalCount: d.selfCount + d.otherCount,
    regime: msgs.find(m => m.ts.toISOString().slice(0,10) === d.dateKey)?.regime || 'neutral'
  }));
}

// ─── KPI Summary ──────────────────────────────────────────────────────────
export function computeKPIs(msgs) {
  const self = msgs.filter(m => m.sender === 'Self');
  const other = msgs.filter(m => m.sender === 'Other');
  const selfLatencies = msgs.filter(m => m.sender === 'Self' && m.replyLatencyMs > 0).map(m => m.replyLatencyMs / 60000);
  const otherLatencies = msgs.filter(m => m.sender === 'Other' && m.replyLatencyMs > 0).map(m => m.replyLatencyMs / 60000);
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const selfSentiments = self.map(m => m.sentiment);
  const totalHorsemen = msgs.reduce((acc, m) => {
    for (const h of Object.keys(m.horsemen)) acc[h] = (acc[h] || 0) + m.horsemen[h];
    return acc;
  }, {});
  const selfEgoCounts = {};
  for (const m of self) selfEgoCounts[m.ego] = (selfEgoCounts[m.ego] || 0) + 1;
  const otherEgoCounts = {};
  for (const m of other) otherEgoCounts[m.ego] = (otherEgoCounts[m.ego] || 0) + 1;
  return {
    totalMsgs: msgs.length,
    selfCount: self.length,
    otherCount: other.length,
    selfShare: self.length / msgs.length,
    avgSelfLatency: avg(selfLatencies),
    avgOtherLatency: avg(otherLatencies),
    avgSelfSentiment: avg(selfSentiments),
    selfInterrupts: self.filter(m => m.interrupt).length,
    selfRepairs: self.filter(m => m.repair).length,
    otherRepairs: other.filter(m => m.repair).length,
    horsemen: totalHorsemen,
    selfEgoCounts,
    otherEgoCounts,
    dateRange: msgs.length ? `${msgs[0].ts.toISOString().slice(0,10)} → ${msgs[msgs.length-1].ts.toISOString().slice(0,10)}` : ''
  };
}

// ─── TA Aggregates ────────────────────────────────────────────────────────
export function computeTAStats(msgs) {
  const self = msgs.filter(m => m.sender === 'Self');
  const other = msgs.filter(m => m.sender === 'Other');
  const pct = (counts, key) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return total ? ((counts[key] || 0) / total) : 0;
  };

  const selfCounts = {};
  const otherCounts = {};
  for (const m of self) selfCounts[m.ego] = (selfCounts[m.ego] || 0) + 1;
  for (const m of other) otherCounts[m.ego] = (otherCounts[m.ego] || 0) + 1;

  // Drama Triangle: proxy from ego patterns
  const selfCP = pct(selfCounts, 'CP');
  const selfAC = pct(selfCounts, 'AC');
  const selfNP = pct(selfCounts, 'NP');
  const otherAC = pct(otherCounts, 'AC');
  const otherCP = pct(otherCounts, 'CP');

  const dramaSelf = {
    Persecutor: Math.round(selfCP * 100),
    Rescuer: Math.round(selfNP * 100),
    Victim: Math.round(selfAC * 100)
  };

  // Stroke economy
  const selfPos = self.filter(m => m.sentiment > 0.1).length;
  const selfNeg = self.filter(m => m.sentiment < -0.1).length;
  const selfCond = self.filter(m => m.ego === 'CP' && m.repair === 0).length;

  // Games detection
  const games = [];
  const interrupts = self.filter(m => m.interrupt).length;
  if (interrupts > self.length * 0.1) {
    games.push({
      name: 'NIGYSOB (Now I\'ve Got You)',
      desc: `${interrupts} rapid self-follow-ups before reply. Setup: escalate without waiting. Switch: receive overwhelm complaint. Payoff: justified anger.`
    });
  }
  const ruptureRepairs = msgs.filter(m => m.regime === 'rupture' && m.repair).length;
  if (ruptureRepairs < 2 && msgs.filter(m => m.regime === 'rupture').length > 10) {
    games.push({
      name: 'Yes, But',
      desc: 'Rupture windows show problems surfaced but solutions deflected. Both parties stay stuck — the "game" is the familiarity of the loop itself.'
    });
  }
  const selfHP = self.filter(m => m.horsemen.criticism || m.horsemen.contempt).length;
  if (selfHP > self.length * 0.08) {
    games.push({
      name: 'Kick Me',
      desc: `Critical language (${selfHP} instances) invites defensive counter. Pattern: Self criticises → Other withdraws → Self escalates → conflict deepens.`
    });
  }

  return { selfCounts, otherCounts, dramaSelf, selfPos, selfNeg, selfCond, games };
}

// ─── Coaching Flags ───────────────────────────────────────────────────────
export function generateFlags(days, msgs, kpis) {
  const flags = [];
  for (const d of days) {
    const selfPowerRatio = d.selfCount ? d.selfPower / d.selfCount : 0;
    if (selfPowerRatio > 0.2) {
      flags.push({
        id: `g-power-${d.dateKey}`, ts: d.ts, dateKey: d.dateKey,
        framework: 'gottman', severity: 'act',
        trigger: 'Power/control language elevated',
        cue: 'Soft start-up',
        guidance: "Replace 'you always / you never' with Gottman's soft start-up: 'I feel ___ about ___, I need ___'. Specific, present-tense, one issue."
      });
    }
    const h = d.horsemen;
    const hTotal = Object.values(h).reduce((a, b) => a + b, 0);
    if (hTotal > 5) {
      const worst = Object.entries(h).sort((a, b) => b[1] - a[1])[0][0];
      const antidotes = {
        criticism: "Gentle complaint about behaviour, not character. 'When X happens, I feel Y' instead of 'You are Z'.",
        contempt: "Antidote to contempt: build a culture of appreciation. Name one thing you respect before reopening the issue.",
        defensiveness: "Take responsibility, even for 5%. 'You're right that I escalated — that part is mine.'",
        stonewalling: "Physiological self-soothing for 20 min, then explicit re-engagement: 'I'm back. Can we continue?'"
      };
      flags.push({
        id: `g-horse-${d.dateKey}`, ts: d.ts, dateKey: d.dateKey,
        framework: 'gottman', severity: 'act',
        trigger: `Four Horsemen peak (${worst})`,
        cue: 'Antidote',
        guidance: antidotes[worst]
      });
    }
    if (d.selfSentimentAvg < -0.35) {
      flags.push({
        id: `dbt-${d.dateKey}`, ts: d.ts, dateKey: d.dateKey,
        framework: 'dbt', severity: 'act',
        trigger: 'Emotional intensity above threshold',
        cue: 'TIPP / STOP',
        guidance: 'Distress tolerance window. TIPP: cold water on face, 60s paced breathing (5-in / 7-out). Or STOP: Stop, Take a step back, Observe, Proceed mindfully. Re-enter only after intensity drops.'
      });
    }
    if (d.selfInterrupt > 2) {
      flags.push({
        id: `att-${d.dateKey}`, ts: d.ts, dateKey: d.dateKey,
        framework: 'attachment', severity: 'watch',
        trigger: `Anxious-burst: ${d.selfInterrupt} rapid follow-ups`,
        cue: 'Hyperactivation container',
        guidance: "Rapid follow-ups before reply signal hyperactivated attachment. Set a 20–30 min container: one message, then breathe. The urgency is inside you, not in the silence."
      });
    }
  }
  // TA flags — ego state clashes
  for (const m of msgs) {
    if (m.ego === 'CP' && m.sender === 'Self' && m.power) {
      flags.push({
        id: `ta-cp-${m.ts.getTime()}`, ts: m.ts, dateKey: m.ts.toISOString().slice(0,10),
        framework: 'ta', severity: 'watch',
        trigger: 'Critical Parent ego state detected',
        cue: 'Ego state shift → Adult',
        guidance: `CP message: "${m.content.slice(0,60)}..." — Critical Parent invites Adapted Child or counter-CP. Shift to Adult: state observations, not judgements.`
      });
    }
  }
  // Repair wins
  for (const m of msgs) {
    if (m.repair && m.regime === 'repair') {
      flags.push({
        id: `repair-${m.ts.getTime()}`, ts: m.ts, dateKey: m.ts.toISOString().slice(0,10),
        framework: 'gottman', severity: 'good',
        trigger: 'Repair attempt — stability win',
        cue: 'Reinforce this',
        guidance: `"${m.content.slice(0,80)}" — Gottman's #1 predictor of stability. Notice what worked: naming the rupture, taking ownership, returning soft. Repeat this recipe.`
      });
    }
  }
  // Deduplicate and sort
  const seen = new Set();
  return flags
    .filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true; })
    .sort((a, b) => a.ts - b.ts)
    .slice(0, 40); // cap for performance
}

// ─── Regime Segments for bar ───────────────────────────────────────────────
export function buildRegimeSegments(msgs) {
  if (!msgs.length) return [];
  const segments = [];
  let cur = { regime: msgs[0].regime, start: msgs[0].ts, count: 1 };
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i].regime === cur.regime) { cur.count++; }
    else {
      segments.push({ ...cur, end: msgs[i].ts });
      cur = { regime: msgs[i].regime, start: msgs[i].ts, count: 1 };
    }
  }
  segments.push({ ...cur, end: msgs[msgs.length - 1].ts });
  const total = segments.reduce((a, s) => a + s.count, 0);
  return segments.map(s => ({ ...s, pct: s.count / total * 100 }));
}
