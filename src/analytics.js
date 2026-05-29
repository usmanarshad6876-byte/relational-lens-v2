// ───────────────────────────────────────────────
// ANALYTICS ENGINE
// Sentiment · Power · Attachment · TA Ego States
// Gottman · DBT · Drama Triangle · Stroke Economy
// ───────────────────────────────────────────────

// ── Lexicons ──────────────────────────────────

const POWER_WORDS = [
  'always','never','you have to','you need to','you must','you should',
  "don't you dare",'why don\'t you','you never','you always','your fault',
  'because of you','you made me','you ruined','you\'re wrong','admit it',
  'i told you','how many times','unacceptable','disappointed in you',
  'what is wrong with you','you\'re not','you can\'t','i demand','i insist',
  'ultimatum','or else','last chance','i\'m done','fine. leave','whatever.'
];

const CRITICISM_WORDS = [
  'you always','you never','you\'re so','you are so','you\'re such',
  'you\'re the problem','your problem is','you don\'t care','you don\'t even',
  'how could you','how dare you','disgusting','pathetic','ridiculous',
  'unbelievable','you\'re impossible','typical','predictable'
];

const CONTEMPT_WORDS = [
  'whatever','rolling eyes','you\'re pathetic','you\'re ridiculous',
  'i can\'t with you','talking to a wall','waste of time','joke','laughable',
  'beneath me','grow up','immature','childish','like you\'d understand'
];

const DEFENSIVENESS_WORDS = [
  "it's not my fault","wasn't my fault","i didn't do anything",
  "why are you","don't blame me","i was only","you started it",
  "leave me out of","nothing to do with me","i tried to","i always",
  "you never give me credit","after everything i did"
];

const STONEWALLING_WORDS = [
  "i'm done talking","i don't want to discuss","drop it",
  "not having this conversation","leave me alone","i'm out",
  "silence","..","nothing to say","whatever you say","fine",
  "i don't care anymore","suit yourself","as you wish"
];

const REPAIR_WORDS = [
  "i'm sorry","i apologise","i apologize","my fault","that was wrong of me",
  "i shouldn't have","can we start over","can we restart","i was anxious",
  "i was stressed","i overreacted","let me rephrase","i hear you",
  "you're right","fair point","i understand","i see your point",
  "i love you","i miss you","can we talk","i need you","you matter"
];

// ── TA Ego State lexicons ──────────────────────

const TA_PATTERNS = {
  CP: { // Critical Parent
    words: ['you must','you should','you have to','you always','you never',
      'how dare','disappointing','irresponsible','unacceptable','i told you',
      'why can\'t you','your fault','you ruined','you\'re wrong','admit it',
      'stop being','you need to behave','not acceptable','i forbid',
      'because i said','do as i say','don\'t question'],
    weight: 1.2
  },
  NP: { // Nurturing Parent
    words: ['are you okay','are you alright','how are you feeling','i\'m here for you',
      'i\'ll help you','let me help','you can do it','i believe in you',
      'take care of yourself','please eat','please rest','i worry about you',
      'i care about you','let me know if','i\'m here','call me anytime',
      'be safe','take it easy','don\'t overdo it','i\'ll take care'],
    weight: 1.0
  },
  A: { // Adult
    words: ['i think','i understand','from my perspective','what i mean is',
      'let me clarify','to be clear','the situation is','here\'s what happened',
      'i noticed that','can we discuss','my understanding is','the facts are',
      'i propose','shall we','what do you think','would it help',
      'i suggest','in my view','logically','specifically','to summarise'],
    weight: 1.0
  },
  AC: { // Adapted Child
    words: ['i\'m sorry for everything','it\'s my fault','i\'m stupid','i\'m worthless',
      'you\'re right i\'m wrong','i can\'t do anything right','please don\'t be angry',
      'please forgive me','i\'ll be better','i promise i\'ll change',
      'i was wrong about everything','don\'t leave me','please stay',
      'i\'ll do whatever you want','you always know best','i\'m scared',
      'please don\'t go','i beg you'],
    weight: 1.1
  },
  FC: { // Free Child
    words: ['haha','lol','😂','😄','❤️','that\'s so fun','i love this',
      'can\'t wait','excited','yay','wow','amazing','wonderful',
      'feel like playing','feel like doing','spontaneous','let\'s just',
      'forget it let\'s','you know what let\'s','forget the rules',
      'on impulse','just because'],
    weight: 0.9
  }
};

// ── Scoring helpers ─────────────────────────

function scoreWords(text, wordList) {
  const lower = text.toLowerCase();
  return wordList.filter(w => lower.includes(w)).length;
}

function classifyEgoState(text) {
  const scores = {};
  for (const [state, config] of Object.entries(TA_PATTERNS)) {
    scores[state] = scoreWords(text, config.words) * config.weight;
  }
  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  // If total score is very low, default to Adult
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total < 0.5) return 'A';
  return dominant[0];
}

function scoreSentiment(text) {
  const positive = scoreWords(text, REPAIR_WORDS) + scoreWords(text, TA_PATTERNS.NP.words);
  const negative = scoreWords(text, POWER_WORDS) + scoreWords(text, CRITICISM_WORDS) + scoreWords(text, CONTEMPT_WORDS);
  const len = Math.max(text.length / 60, 1);
  return Math.max(-1, Math.min(1, (positive - negative * 1.2) / len));
}

function scoreHorseman(text) {
  const lower = text.toLowerCase();
  if (scoreWords(lower, CONTEMPT_WORDS) > 0) return 'contempt';
  if (scoreWords(lower, CRITICISM_WORDS) > 0) return 'criticism';
  if (scoreWords(lower, DEFENSIVENESS_WORDS) > 0) return 'defensiveness';
  if (scoreWords(lower, STONEWALLING_WORDS) > 0) return 'stonewalling';
  return null;
}

function scorePower(text) {
  const n = scoreWords(text, POWER_WORDS);
  const len = Math.max(text.length / 80, 1);
  return Math.min(1, n * 0.4 / len);
}

function scoreIntensity(text) {
  const exclamations = (text.match(/!/g) || []).length;
  const caps = (text.match(/[A-Z]{2,}/g) || []).length;
  const question = (text.match(/\?/g) || []).length;
  const len = Math.max(text.length / 100, 1);
  return Math.min(1, (exclamations * 0.3 + caps * 0.2 + question * 0.1) / len + 0.1);
}

// ── Drama Triangle detection ──────────────────

function detectDramaRole(text, sender) {
  const lower = text.toLowerCase();
  if (scoreWords(lower, POWER_WORDS) + scoreWords(lower, CRITICISM_WORDS) > 1) return 'Persecutor';
  if (scoreWords(lower, TA_PATTERNS.NP.words) > 1) return 'Rescuer';
  if (scoreWords(lower, TA_PATTERNS.AC.words) > 1) return 'Victim';
  return null;
}

// ── Main analytics function ────────────────────

export function analyseMessages(rawMessages) {
  if (!rawMessages || rawMessages.length === 0) return null;

  // Sort by timestamp
  const msgs = [...rawMessages].sort((a, b) => a.ts - b.ts);

  // Enrich each message
  const lastSeen = { Self: null, Other: null };
  const enriched = msgs.map(msg => {
    const other = msg.sender === 'Self' ? 'Other' : 'Self';
    const prevOther = lastSeen[other];
    const replyDelayMin = prevOther ? Math.max(0.1, (msg.ts - prevOther) / 60000) : null;
    const prevSelf = lastSeen[msg.sender];
    const timeSinceSelf = prevSelf ? (msg.ts - prevSelf) / 60000 : 999;
    const interruption = msg.sender === 'Self' && timeSinceSelf < 4;

    const egoState = classifyEgoState(msg.text);
    const sentiment = scoreSentiment(msg.text);
    const power = scorePower(msg.text);
    const intensity = scoreIntensity(msg.text);
    const fourHorseman = scoreHorseman(msg.text);
    const repair = REPAIR_WORDS.some(w => msg.text.toLowerCase().includes(w));
    const dramaRole = detectDramaRole(msg.text, msg.sender);

    lastSeen[msg.sender] = msg.ts;
    return {
      ...msg,
      egoState,
      sentiment,
      power,
      intensity,
      replyDelayMin,
      interruption,
      fourHorseman,
      repair,
      dramaRole,
    };
  });

  // ── Aggregate by day ──
  const dayMap = new Map();
  for (const msg of enriched) {
    const d = new Date(msg.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!dayMap.has(key)) {
      dayMap.set(key, {
        dateKey: key,
        ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
        total: 0,
        selfCount: 0, otherCount: 0,
        selfSentiment: 0, otherSentiment: 0,
        selfIntensity: 0, selfPower: 0,
        selfReplyDelayMin: 0, otherReplyDelayMin: 0,
        selfReplyCount: 0, otherReplyCount: 0,
        interruptionCount: 0,
        horsemen: { criticism: 0, contempt: 0, defensiveness: 0, stonewalling: 0 },
        repairs: 0,
        egoStates: { CP: 0, NP: 0, A: 0, AC: 0, FC: 0 },
        dramaRoles: [],
        selfStrokes: { positive: 0, negative: 0 },
      });
    }
    const day = dayMap.get(key);
    day.total++;
    if (msg.sender === 'Self') {
      day.selfCount++;
      day.selfSentiment += msg.sentiment;
      day.selfIntensity += msg.intensity;
      day.selfPower += msg.power;
      if (msg.replyDelayMin != null) { day.selfReplyDelayMin += msg.replyDelayMin; day.selfReplyCount++; }
      if (msg.interruption) day.interruptionCount++;
      day.egoStates[msg.egoState]++;
      if (msg.sentiment > 0.1) day.selfStrokes.positive++;
      else if (msg.sentiment < -0.1) day.selfStrokes.negative++;
    } else {
      day.otherCount++;
      day.otherSentiment += msg.sentiment;
      if (msg.replyDelayMin != null) { day.otherReplyDelayMin += msg.replyDelayMin; day.otherReplyCount++; }
    }
    if (msg.fourHorseman) day.horsemen[msg.fourHorseman]++;
    if (msg.repair) day.repairs++;
    if (msg.dramaRole) day.dramaRoles.push({ role: msg.dramaRole, ts: msg.ts, text: msg.text.substring(0, 80) });
  }

  // Normalise aggregates
  const days = [...dayMap.values()].map(day => {
    if (day.selfCount) {
      day.selfSentiment /= day.selfCount;
      day.selfIntensity /= day.selfCount;
      day.selfPower /= day.selfCount;
    }
    if (day.otherCount) day.otherSentiment /= day.otherCount;
    if (day.selfReplyCount) day.selfReplyDelayMin /= day.selfReplyCount;
    if (day.otherReplyCount) day.otherReplyDelayMin /= day.otherReplyCount;
    return day;
  }).sort((a, b) => a.ts - b.ts);

  // ── Generate coaching flags ──
  const flags = [];
  for (const day of days) {
    // Gottman: power/control
    if (day.selfPower > 0.25) {
      flags.push({
        id: `gottman-power-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'Gottman', severity: 'act',
        trigger: 'Power/control language elevated',
        cue: 'Soft start-up',
        guidance: "Replace 'you always / you never' with the Gottman soft start-up: 'I feel ___ about ___, I need ___'. Specific, present-tense, one issue. This protects against criticism and contempt — two of the Four Horsemen."
      });
    }
    // Gottman: Four Horsemen
    const totalHorsemen = Object.values(day.horsemen).reduce((a, b) => a + b, 0);
    if (totalHorsemen > 2) {
      const dominant = Object.entries(day.horsemen).sort((a, b) => b[1] - a[1])[0][0];
      const antidotes = {
        criticism: "Antidote to criticism: gentle complaint about a behaviour, not an attack on character. 'When X happens I feel Y' instead of 'You are Z'.",
        contempt: "Antidote to contempt: build a culture of appreciation. Name one thing they did this week you respect, before re-opening the issue.",
        defensiveness: "Antidote to defensiveness: take responsibility, even for 5%. 'You're right that I escalated. That part is mine.'",
        stonewalling: "Antidote to stonewalling: physiological self-soothing for 20 min, then explicit re-engagement: 'I'm back, I needed to settle. Can we continue?'"
      };
      flags.push({
        id: `horseman-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'Gottman', severity: 'watch',
        trigger: `Four Horsemen: ${dominant} detected`,
        cue: 'Antidote',
        guidance: antidotes[dominant]
      });
    }
    // Gottman: repair
    if (day.repairs > 0 && day.selfSentiment > -0.1) {
      flags.push({
        id: `repair-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'Gottman', severity: 'info',
        trigger: 'Repair attempt present',
        cue: 'Stability win',
        guidance: "Successful repair attempt — Gottman's #1 predictor of long-term stability. Notice what worked: naming the rupture, taking ownership, returning soft. Repeat that recipe."
      });
    }
    // DBT: intensity
    if (day.selfIntensity > 0.5) {
      flags.push({
        id: `dbt-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'DBT', severity: 'act',
        trigger: 'Emotional intensity elevated',
        cue: 'TIPP / STOP',
        guidance: "Distress tolerance window. Use TIPP: cold water on face, 60s of paced breathing (5-in / 7-out), progressive muscle release. Or STOP: Stop, Take a step back, Observe, Proceed mindfully. Re-enter only after intensity drops one notch."
      });
    }
    // TA: Critical Parent dominant
    const totalEgo = Object.values(day.egoStates).reduce((a, b) => a + b, 0);
    if (totalEgo > 0 && day.egoStates.CP / totalEgo > 0.4) {
      flags.push({
        id: `ta-cp-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'TA', severity: 'act',
        trigger: 'Critical Parent ego state dominant',
        cue: 'Shift to Adult',
        guidance: "Your Critical Parent is driving today — expect the other person to activate Adapted Child or counter with their own Critical Parent. Deliberately shift to Adult: describe the situation factually, state your feeling once, and ask one clear question rather than issuing a judgement."
      });
    }
    // TA: Adapted Child
    if (totalEgo > 0 && day.egoStates.AC / totalEgo > 0.4) {
      flags.push({
        id: `ta-ac-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'TA', severity: 'watch',
        trigger: 'Adapted Child ego state dominant',
        cue: 'Activate Adult',
        guidance: "High Adapted Child activity — you may be placating, over-apologising, or deferring to avoid conflict. This often invites a Rescuer or Critical Parent response from the other person. Activate your Adult: set one boundary clearly without apologising for it."
      });
    }
    // TA: Drama Triangle
    const dramaCount = day.dramaRoles.length;

    if (dramaCount >= 2) {
      const roles = day.dramaRoles.map(r => r.role);
      const hasSwitch = new Set(roles).size > 1;
      flags.push({
        id: `ta-drama-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'TA', severity: hasSwitch ? 'act' : 'watch',
        trigger: `Drama Triangle: ${[...new Set(roles)].join(' → ')} pattern`,
        cue: 'Exit the triangle',
        guidance: "The Drama Triangle is active. Persecutor blames, Victim deflects, Rescuer over-helps — all three positions keep the game going. The exit is Adult-to-Adult contact: name your experience without drama ('I felt dismissed when X happened'), invite their experience ('what was that like for you?'), and resist the pull to fix, blame, or collapse."
      });
    }
    // Attachment: hyperactivation
    if (day.interruptionCount >= 3) {
      flags.push({
        id: `attach-${day.dateKey}`,
        ts: day.ts, dateKey: day.dateKey,
        framework: 'Attachment', severity: 'act',
        trigger: `Anxious-attachment burst: ${day.interruptionCount} rapid follow-ups`,
        cue: 'Contain the burst',
        guidance: "You sent multiple messages before a reply came — an anxious-attachment burst pattern. Each unanswered message raises your own cortisol and signals urgency to the other person, which may trigger withdrawal. Try: send one message, then set a 20-minute container. Let the gap exist. The relationship can hold the space."
      });
    }
  }

  // ── Global KPIs ──
  const allSelf = enriched.filter(m => m.sender === 'Self');
  const allOther = enriched.filter(m => m.sender === 'Other');
  const selfReplies = allSelf.filter(m => m.replyDelayMin != null);
  const otherReplies = allOther.filter(m => m.replyDelayMin != null);

  const avgSelfReply = selfReplies.length
    ? selfReplies.reduce((a, m) => a + m.replyDelayMin, 0) / selfReplies.length : 0;
  const avgSelfSentiment = allSelf.length
    ? allSelf.reduce((a, m) => a + m.sentiment, 0) / allSelf.length : 0;
  const avgOtherSentiment = allOther.length
    ? allOther.reduce((a, m) => a + m.sentiment, 0) / allOther.length : 0;
  const totalRepairs = enriched.filter(m => m.repair).length;
  const totalInterruptions = enriched.filter(m => m.interruption).length;

  // ── Ego state totals ──
  const egoTotals = { CP: 0, NP: 0, A: 0, AC: 0, FC: 0 };
  for (const msg of allSelf) egoTotals[msg.egoState]++;

  // ── Stroke economy ──
  const selfPositive = allSelf.filter(m => m.sentiment > 0.1).length;
  const selfNegative = allSelf.filter(m => m.sentiment < -0.1).length;
  const otherPositive = allOther.filter(m => m.sentiment > 0.1).length;
  const otherNegative = allOther.filter(m => m.sentiment < -0.1).length;

  // ── Drama Triangle instances ──
  const dramaInstances = days.flatMap(d => d.dramaRoles.map(r => ({ ...r, dateKey: d.dateKey })));

  // ── Psychological games ──
  const games = detectGames(enriched);

  // ── Regime sequence ──
  const regimes = classifyRegimes(days);

  return {
    messages: enriched,
    days,
    flags: flags.sort((a, b) => b.ts - a.ts),
    kpi: {
      totalMessages: enriched.length,
      selfCount: allSelf.length,
      otherCount: allOther.length,
      avgSelfReplyMin: avgSelfReply,
      avgSelfSentiment,
      avgOtherSentiment,
      totalRepairs,
      totalInterruptions,
      daysSpan: days.length,
    },
    egoTotals,
    strokes: { selfPositive, selfNegative, otherPositive, otherNegative },
    dramaInstances,
    games,
    regimes,
  };
}

// ── Game detection ────────────────────────────

function detectGames(messages) {
  const games = [];
  const selfMsgs = messages.filter(m => m.sender === 'Self');

  // NIGYSOB: high power + contempt sequence
  const nigysob = selfMsgs.filter(m => m.power > 0.3 && m.fourHorseman === 'contempt');
  if (nigysob.length >= 2) {
    games.push({
      name: 'NIGYSOB',
      fullName: 'Now I\'ve Got You, You SOB',
      pattern: 'Criticism → contempt → escalation → "you see what you made me do"',
      description: `Detected ${nigysob.length} instances of contempt-loaded power language. The game sets up a win condition where the other person's reaction justifies pre-existing grievance. Exit: name the feeling underneath the accusation before the other person has to point it out.`,
      instances: nigysob.length
    });
  }

  // Yes But: repeated question/suggestion followed by deflection
  const yesButWindows = [];
  for (let i = 0; i < messages.length - 3; i++) {
    const w = messages.slice(i, i + 6);
    const hasSuggestion = w.some(m => m.sender === 'Other' && m.text.match(/what if|try|could you|maybe|how about|suggest/i));
    const hasDeflection = w.some(m => m.sender === 'Self' && m.text.match(/but|however|except|though|still|already tried|doesn't work|won't work/i));
    if (hasSuggestion && hasDeflection) yesButWindows.push(i);
  }
  if (yesButWindows.length >= 2) {
    games.push({
      name: 'Yes But',
      fullName: 'Yes But',
      pattern: 'Other offers suggestion → Self deflects with "but…"',
      description: `Detected ${yesButWindows.length} suggestion-rejection sequences. "Yes But" keeps the person in Victim position while exhausting the Rescuer. Exit: ask "what would you need to feel differently about this?" instead of answering the suggestion.`,
      instances: yesButWindows.length
    });
  }

  // Kick Me: repeated self-deprecation attracting criticism
  const kickMe = selfMsgs.filter(m => m.egoState === 'AC' && m.sentiment < -0.3);
  if (kickMe.length >= 3) {
    games.push({
      name: 'Kick Me',
      fullName: 'Kick Me',
      pattern: 'Self-deprecation → invites criticism → confirms negative self-belief',
      description: `Detected ${kickMe.length} instances of Adapted Child self-deprecation. The game confirms an internal script ("I am unworthy") by eliciting confirming reactions. Exit: replace self-attacks with factual Adult statements about the situation rather than statements about the self.`,
      instances: kickMe.length
    });
  }

  return games;
}

// ── Regime classification ─────────────────────

function classifyRegimes(days) {
  return days.map(day => {
    const s = day.selfSentiment;
    const p = day.selfPower;
    const h = Object.values(day.horsemen).reduce((a, b) => a + b, 0);
    const r = day.repairs;

    let regime;
    if (r > 0 && s > -0.05) regime = 'repair';
    else if (h >= 3 || p > 0.5) regime = 'rupture';
    else if (p > 0.25 || s < -0.2) regime = 'tense';
    else if (s > 0.15) regime = 'warm';
    else regime = 'neutral';

    return { ...day, regime };
  });
}

// ── Demo synthetic dataset ────────────────────

export function generateDemoData() {
  const selfName = 'You';
  const otherName = 'Alex';
  const start = Date.now() - 14 * 24 * 3600 * 1000;

  const phases = [
    { regime: 'warm', days: 3 },
    { regime: 'neutral', days: 2 },
    { regime: 'tense', days: 2 },
    { regime: 'rupture', days: 1 },
    { regime: 'repair', days: 2 },
    { regime: 'neutral', days: 2 },
    { regime: 'warm', days: 2 },
  ];

  const templates = {
    warm: {
      Self: ["Good morning :)", "thinking of you", "how was your day?", "❤️", "i had such a good time last night", "can we do that again soon?", "you always know how to make me smile"],
      Other: ["you too!", "it was great, thanks for asking", "can't wait to see you", "me too honestly", "yes definitely", "you're the best honestly", "😊"]
    },
    neutral: {
      Self: ["okay cool", "sure that works", "what time again?", "i'll let you know", "that makes sense", "understood", "okay"],
      Other: ["sounds good", "works for me", "let me know", "okay", "got it", "sure", "alright"]
    },
    tense: {
      Self: ["you should have told me", "you never think about how i feel", "i've said this before", "why does this always happen", "you always do this", "this is disappointing", "i told you"],
      Other: ["i was just trying to help", "i didn't mean it like that", "it wasn't my fault", "why are you upset", "i don't understand why you're angry", "fine", "whatever"]
    },
    rupture: {
      Self: ["you always dismiss me", "i can't believe you did that", "how dare you", "you ruined this", "i'm done talking about this", "this is unacceptable", "you never listen"],
      Other: ["that's not fair", "leave me out of this", "i'm done", "whatever you say", "fine", "...", "i can't do this right now"]
    },
    repair: {
      Self: ["i'm sorry for how i reacted", "i was anxious, that's on me", "can we restart this conversation?", "i shouldn't have said that", "you were right, i overreacted", "i care about you", "i miss you"],
      Other: ["thank you for saying that", "i appreciate it", "i'm sorry too", "yes let's start over", "i love you", "we're okay", "i hear you"]
    }
  };

  const messages = [];
  let ts = start;
  let id = 0;

  for (const phase of phases) {
    const msgsPerDay = phase.regime === 'rupture' ? 25 : phase.regime === 'warm' ? 18 : 12;
    for (let d = 0; d < phase.days; d++) {
      const dayStart = ts + d * 86400000 + 7 * 3600000;
      let t = dayStart;
      for (let m = 0; m < msgsPerDay; m++) {
        const sender = Math.random() < 0.55 ? 'Self' : 'Other';
        const pool = templates[phase.regime][sender];
        const text = pool[Math.floor(Math.random() * pool.length)];
        const gap = phase.regime === 'rupture' ? Math.random() * 300000 : Math.random() * 3600000;
        t += gap + 30000;
        messages.push({ id: id++, ts: t, sender, originalSender: sender === 'Self' ? selfName : otherName, text });
      }
    }
    ts += phase.days * 86400000;
  }

  return messages.sort((a, b) => a.ts - b.ts);
}
