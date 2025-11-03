//formating csv export
function formatCurrency(value) {
  const n = Number(value);
  if (!isFinite(n)) return '$0.00';
  return '$' + n.toFixed(2);
}

function formatDateISO(iso) {

  return iso || '';
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function getCategoryCounts(items) {
  const counts = {};
  for (const p of items) {
    const c = (p.category || 'Other');
    counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}

function maxValue(obj) {
  return Object.values(obj).reduce((m, v) => Math.max(m, v), 0);
}


function toCSV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    //this will escape double quotes and wrap in quotes if needed
    const needsQuotes = s.includes(',') || s.includes('"') || s.includes('\n');
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');

  return csv;
}
function downloadFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function groupByCategory(items, categoriesFromSettings) {
  const result = {};
  const categories = categoriesFromSettings && categoriesFromSettings.length
    ? categoriesFromSettings
    : [];

  //initialize defined categories to avoid missing groups
  for (const cat of categories) result[cat] = { items: [], count: 0, qty: 0, value: 0 };

  for (const p of items) {
    const cat = p.category || 'Other';
    if (!result[cat]) result[cat] = { items: [], count: 0, qty: 0, value: 0 };
    const qty = Number(p.quantity);
    const price = Number(p.price);
    result[cat].items.push(p);
    result[cat].count += 1;
    result[cat].qty += isFinite(qty) ? qty : 0;
    result[cat].value += (isFinite(qty) && isFinite(price)) ? qty * price : 0;
  }
  return result;
}

function toCategorySummaryRows(grouped) {
  const rows = [];
  for (const cat of Object.keys(grouped).sort()) {
    const g = grouped[cat];
    rows.push({
      category: cat,
      products: g.count,
      total_qty: g.qty,
      inventory_value: Number(g.value.toFixed(2)),
    });
  }
  return rows;
}