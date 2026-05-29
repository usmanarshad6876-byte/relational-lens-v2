// WhatsApp export parser
// Handles formats: [DD/MM/YYYY, HH:MM:SS] Name: message
//                  DD/MM/YYYY, HH:MM - Name: message (Android)
//                  [M/D/YY, H:MM:SS AM/PM] Name: message (iOS US)

export function parseWhatsAppExport(text, selfName, otherName) {
  const lines = text.split('\n');
  const messages = [];
  let current = null;

  const patterns = [
    // iOS: [DD/MM/YYYY, HH:MM:SS] Name: msg
    /^\[(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+?):\s*([\s\S]*)/i,
    // Android: DD/MM/YYYY, HH:MM - Name: msg
    /^(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*-\s*([^:]+?):\s*([\s\S]*)/i,
  ];

  for (const line of lines) {
    let matched = false;
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        if (current) messages.push(current);
        const ts = parseTimestamp(m[1], m[2]);
        const sender = m[3].trim();
        current = { ts, sender, text: m[4] };
        matched = true;
        break;
      }
    }
    if (!matched && current) {
      current.text += '\n' + line;
    }
  }
  if (current) messages.push(current);

  // Filter to only the two configured senders
  const filtered = messages.filter(msg => {
    const s = msg.sender.toLowerCase();
    return s.includes(selfName.toLowerCase()) || s.includes(otherName.toLowerCase());
  });

  // Normalise sender names
  return filtered.map(msg => ({
    ...msg,
    sender: msg.sender.toLowerCase().includes(selfName.toLowerCase()) ? 'Self' : 'Other',
    originalSender: msg.sender,
  }));
}

function parseTimestamp(dateStr, timeStr) {
  const dateParts = dateStr.split(/[\/\.]/).map(Number);
  let [d, mo, yr] = dateParts;
  if (yr < 100) yr += 2000;
  // Fix US format M/D/YY
  if (dateParts[0] > 12) { [d, mo] = [mo, d]; }

  let [h, min, sec] = timeStr.replace(/[AP]M/i, '').trim().split(':').map(Number);
  if (/PM/i.test(timeStr) && h !== 12) h += 12;
  if (/AM/i.test(timeStr) && h === 12) h = 0;

  return new Date(yr, mo - 1, d, h || 0, min || 0, sec || 0).getTime();
}

export function detectSenders(text) {
  const lines = text.split('\n').slice(0, 200);
  const names = new Set();
  const patterns = [
    /^\[[\d\/\.]+,\s*[\d:]+(?:\s*[AP]M)?\]\s*([^:]+?):/i,
    /^[\d\/\.]+,\s*[\d:]+(?:\s*[AP]M)?\s*-\s*([^:]+?):/i,
  ];
  for (const line of lines) {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const name = m[1].trim();
        if (name && !name.includes('omitted') && name.length < 50) {
          names.add(name);
        }
      }
    }
  }
  return [...names].slice(0, 10);
}
