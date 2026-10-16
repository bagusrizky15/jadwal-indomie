// Tanggal selalu string ISO "YYYY-MM-DD"; hitung pakai nomor hari UTC supaya bebas DST/zona waktu.
const DAY = 864e5;

export const toNum = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
export const toIso = (n) => new Date(n * DAY).toISOString().slice(0, 10);
export const isWeekend = (iso) => [0, 6].includes(new Date(toNum(iso) * DAY).getUTCDay());

export const isValidIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(toNum(s)) === s;

export function todayIso() {
  const t = new Date();
  return toIso(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAY);
}

// holidays: { "2026-01-01": "Tahun Baru", ... }
export const isOff = (iso, holidays) => isWeekend(iso) || iso in holidays;

// Siklus = wfh hari WFH lalu wfo hari WFO. Posisi 0..wfh-1 = WFH, wfh..wfh+wfo-1 = WFO; null kalau libur.
// anchor = hari WFH pertama dalam satu siklus (hari kerja).
export function cyclePos(iso, anchor, holidays, wfh = 1, wfo = 3) {
  const len = wfh + wfo;
  if (isOff(iso, holidays)) return null;
  const a = toNum(anchor), d = toNum(iso);
  let n = 0; // jumlah hari kerja bertanda dari anchor ke iso
  if (d >= a) for (let i = a + 1; i <= d; i++) n += isOff(toIso(i), holidays) ? 0 : 1;
  else for (let i = d; i < a; i++) n -= isOff(toIso(i), holidays) ? 0 : 1;
  return ((n % len) + len) % len;
}

// 'wfh' | 'wfo' | 'libur'
export function statusOf(iso, anchor, holidays, wfh = 1, wfo = 3) {
  const p = cyclePos(iso, anchor, holidays, wfh, wfo);
  return p === null ? 'libur' : p < wfh ? 'wfh' : 'wfo';
}

// ponytail: scan maju sampai 400 hari; cukup kecuali libur tak masuk akal panjangnya
export function nextWfh(fromIso, anchor, holidays, wfh = 1, wfo = 3) {
  for (let i = toNum(fromIso) + 1; i <= toNum(fromIso) + 400; i++)
    if (statusOf(toIso(i), anchor, holidays, wfh, wfo) === 'wfh') return toIso(i);
  return null;
}

// Satu baris: "2026-01-01 Tahun Baru" (label opsional).
export function parseHolidays(text) {
  const ok = {}, bad = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/);
    if (m && isValidIso(m[1])) ok[m[1]] = m[2];
    else bad.push(line);
  }
  return { ok, bad };
}
