export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = new Date(label || payload[0]?.payload?.ts);
  const dateStr = isNaN(d) ? label : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <div className="custom-tooltip">
      <div className="tt-date">{dateStr}</div>
      {payload.map((p, i) => (
        <div key={i} className="tt-row">
          <span className="tt-key" style={{ color: p.color }}>{p.name}</span>
          <span className="tt-val">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function formatDateKey(dateKey) {
  if (!dateKey) return '';
  const d = new Date(dateKey);
  if (isNaN(d)) return dateKey;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatMinutes(min) {
  if (!min) return '—';
  if (min < 60) return `${min.toFixed(0)}m`;
  return `${(min / 60).toFixed(1)}h`;
}

export function sentimentLabel(val) {
  if (val > 0.3) return 'Positive';
  if (val > 0.05) return 'Mild positive';
  if (val > -0.05) return 'Neutral';
  if (val > -0.3) return 'Mild negative';
  return 'Negative';
}
