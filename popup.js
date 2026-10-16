import { statusOf, cyclePos, nextWfh, parseHolidays, todayIso, toNum, toIso, isOff, isWeekend, isValidIso } from './schedule.js';

const $ = (id) => document.getElementById(id);
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const LABEL = { wfo: 'WFO', wfh: 'WFH', libur: 'Libur' };
const fmt = (iso) => {
  const d = new Date(toNum(iso) * 864e5);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
};

// chrome.storage di ekstensi; localStorage supaya popup.html bisa dibuka langsung di browser untuk uji.
const store = globalThis.chrome?.storage?.sync ?? {
  get: async () => JSON.parse(localStorage.getItem('jadwal') || '{}'),
  set: async (v) => localStorage.setItem('jadwal', JSON.stringify({ ...JSON.parse(localStorage.getItem('jadwal') || '{}'), ...v })),
};

let { anchor = '', holidays = {}, theme = '', wfh = 1, wfo = 3 } = await store.get(['anchor', 'holidays', 'theme', 'wfh', 'wfo']);
const today = todayIso();
const Y0 = +today.slice(0, 4);
let year = Y0, month = +today.slice(5, 7) - 1;

const save = () => store.set({ anchor, holidays, wfh, wfo });
const hasHolidays = (y) => Object.keys(holidays).some((d) => d.startsWith(`${y}-`));

function show(tab) {
  for (const s of ['today', 'month', 'settings']) $(s).hidden = s !== tab;
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab));
  render();
}

function render() {
  const viewYear = $('month').hidden ? +today.slice(0, 4) : year;
  $('warn').hidden = false;
  if (!anchor && !$('month').hidden) $('warn').textContent = 'Atur "Hari WFH saya" di Pengaturan dulu.';
  else if (!hasHolidays(viewYear)) $('warn').textContent = `Libur ${viewYear} belum diisi, jadwal bisa meleset.`;
  else $('warn').hidden = true;
  if (!anchor && $('month').hidden) $('warn').hidden = true; // kartu hari ini / pengaturan sudah mengarahkan

  renderToday(); renderMonth(); renderSettings();
}

function renderToday() {
  const p = anchor ? cyclePos(today, anchor, holidays, wfh, wfo) : undefined;
  const st = anchor ? statusOf(today, anchor, holidays, wfh, wfo) : '';
  $('card').className = anchor ? `${st}${today in holidays ? ' holiday' : ''}` : 'unset';
  $('card-date').textContent = fmt(today);
  $('card-status').textContent = st ? LABEL[st] : 'Jadwal belum diatur';
  $('setup').hidden = !!anchor;
  const nx = anchor && nextWfh(today, anchor, holidays, wfh, wfo);
  const gap = nx ? toNum(nx) - toNum(today) : 0;
  $('card-sub').textContent = p === undefined ? 'Pilih satu tanggal WFH Anda; hari lain dihitung otomatis.' : p === null ? 'Hari libur, siklus berhenti' : p < wfh ? (wfh > 1 ? `WFH ke-${p + 1} dari ${wfh}` : 'Hari WFH') : `WFO ke-${p - wfh + 1} dari ${wfo}, lalu WFH`;
  // bisa digeser: 2 minggu ke belakang, 6 minggu ke depan, termasuk Sabtu/Minggu
  const days = Array.from({ length: 56 }, (_, i) => toIso(toNum(today) - 14 + i));
  $('strip').replaceChildren(...(anchor ? days : []).map((iso) => {
    const s = statusOf(iso, anchor, holidays, wfh, wfo);
    const kind = iso in holidays ? 'libur holiday' : isWeekend(iso) ? 'weekend' : s;
    const chip = document.createElement('div');
    chip.className = `chip ${kind}${iso === today ? ' today' : ''}`;
    chip.title = holidays[iso] || '';
    const d = document.createElement('b');
    d.textContent = +iso.slice(8);
    chip.append(HARI[new Date(toNum(iso) * 864e5).getUTCDay()], d, LABEL[s]);
    return chip;
  }));
  const t = $('strip').querySelector('.today');
  if (t) $('strip').scrollLeft = t.offsetLeft; // mulai dari hari ini
  $('card-next').replaceChildren();
  if (nx) $('card-next').append('WFH berikutnya: ', Object.assign(document.createElement('b'), { textContent: fmt(nx) }), gap === 1 ? ' (besok)' : ` (${gap} hari lagi)`);
}

function renderMonth() {
  $('month-title').textContent = `${BULAN[month]} ${year}`;
  // ponytail: rentang tetap tahun lalu .. 2 tahun ke depan; libur di luar itu toh belum terbit
  $('prev').disabled = year === Y0 - 1 && month === 0;
  $('next').disabled = year === Y0 + 2 && month === 11;
  $('goto-today').hidden = year === Y0 && month === +today.slice(5, 7) - 1;

  const grid = $('grid');
  const first = toNum(`${year}-${String(month + 1).padStart(2, '0')}-01`);
  const lead = (new Date(first * 864e5).getUTCDay() + 6) % 7; // Senin di kolom pertama
  grid.replaceChildren(...[...HARI.slice(1), HARI[0]].map((h) => Object.assign(document.createElement('div'), { className: 'dow', textContent: h })));
  for (let i = 0; i < lead; i++) grid.append(Object.assign(document.createElement('div'), { className: 'cell blank' }));
  const count = { wfo: 0, wfh: 0, libur: 0 };
  for (let n = first; toIso(n).startsWith(`${year}-${String(month + 1).padStart(2, '0')}`); n++) {
    const iso = toIso(n);
    const st = anchor ? statusOf(iso, anchor, holidays, wfh, wfo) : (isOff(iso, holidays) ? 'libur' : '');
    const weekend = isWeekend(iso);
    if (st && !weekend) count[st]++;
    const c = document.createElement('div');
    c.className = `cell ${iso in holidays ? 'libur' : weekend ? 'weekend' : st}${iso === today ? ' today' : ''}`; // libur di weekend tetap merah
    c.title = [LABEL[weekend ? 'libur' : st], holidays[iso]].filter(Boolean).join(': ');
    const num = document.createElement('b');
    num.textContent = +iso.slice(8);
    c.append(num);
    grid.append(c);
  }
  $('summary').hidden = !anchor;
  $('summary').replaceChildren(...['wfh', 'wfo', 'libur'].flatMap((k) =>
    [Object.assign(document.createElement('i'), { className: `k ${k}` }), `${count[k]} ${LABEL[k]}`]));
}

function renderSettings() {
  $('anchor').value = anchor;
  $('wfh').value = wfh;
  $('wfo').value = wfo;
  const keys = Object.keys(holidays).sort();
  if (!keys.length) return $('holidays').replaceChildren(Object.assign(document.createElement('li'), { className: 'empty', textContent: 'Belum ada libur. Tempel daftar dari surat kantor di kolom atas.' }));
  $('holidays').replaceChildren(...keys.map((iso) => {
    const li = document.createElement('li');
    const txt = document.createElement('span');
    const small = document.createElement('small');
    small.textContent = holidays[iso] || 'Libur';
    txt.append(fmt(iso), small);
    const x = document.createElement('button');
    x.textContent = '✕'; x.setAttribute('aria-label', `Hapus ${iso}`);
    x.onclick = () => { delete holidays[iso]; save(); render(); };
    li.append(txt, x);
    return li;
  }));
}

function msg(text, ok) {
  $('msg').textContent = text;
  $('msg').style.color = ok ? 'var(--good)' : 'var(--bad)';
}

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => show(b.dataset.tab)));
const step = (d) => { month += d; year += Math.floor(month / 12); month = (month + 12) % 12; render(); };
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('goto-today').onclick = () => { year = Y0; month = +today.slice(5, 7) - 1; render(); };

$('anchor').onchange = (e) => {
  const v = e.target.value;
  if (!isValidIso(v) || isOff(v, holidays)) {
    msg('Hari WFH harus hari kerja (bukan weekend / libur).', false);
    e.target.value = anchor;
    return;
  }
  anchor = v; save(); msg('Tersimpan.', true); render();
};

for (const id of ['wfh', 'wfo']) $(id).onchange = (e) => {
  const v = +e.target.value;
  if (!Number.isInteger(v) || v < 1 || v > 20) { msg('Isi angka 1–20.', false); e.target.value = id === 'wfh' ? wfh : wfo; return; }
  if (id === 'wfh') wfh = v; else wfo = v;
  save(); msg('Tersimpan.', true); render();
};

$('add').onclick = () => {
  const { ok, bad } = parseHolidays($('paste').value);
  Object.assign(holidays, ok);
  save();
  if (anchor && isOff(anchor, holidays)) msg('Hari WFH Anda kini jatuh di hari libur; atur ulang.', false);
  else if (bad.length) msg(`${Object.keys(ok).length} ditambah. Baris tidak valid: ${bad.join(' | ')}`, false);
  else msg(`${Object.keys(ok).length} libur ditambah.`, true);
  $('paste').value = bad.join('\n');
  render();
};

// roda mouse vertikal -> geser horizontal (trackpad sudah bisa langsung)
$('strip').onwheel = (e) => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  $('strip').scrollLeft += e.deltaY;
  e.preventDefault();
};

// Libur nasional + cuti bersama dari github.com/guangrei/APIHariLibur_V2 (file statis, CORS terbuka).
// Hasil hanya diisi ke kolom tempel; user edit dulu lalu tekan Tambah.
const HOLIDAY_URL = 'https://raw.githubusercontent.com/guangrei/APIHariLibur_V2/main/holidays.json';
$('fetch').onclick = async () => {
  const btn = $('fetch');
  btn.disabled = true; btn.textContent = 'Mengambil…';
  try {
    const res = await fetch(HOLIDAY_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const lines = Object.keys(data)
      .filter((d) => isValidIso(d) && +d.slice(0, 4) >= Y0 && +d.slice(0, 4) <= Y0 + 1 && !(d in holidays))
      .sort().map((d) => `${d} ${data[d].summary ?? ''}`.trim());
    if (!lines.length) return msg(`Tidak ada libur baru untuk ${Y0}–${Y0 + 1}.`, true);
    $('paste').value = [$('paste').value.trim(), ...lines].filter(Boolean).join('\n');
    $('paste').rows = 10;
    msg(`${lines.length} libur dimuat ke kolom. Cek, hapus yang kantor Anda tidak ikuti, lalu tekan Tambah.`, true);
  } catch (e) {
    msg(`Gagal mengambil data (${e.message}). Cek koneksi internet lalu coba lagi.`, false);
  } finally {
    btn.disabled = false; btn.textContent = 'Fetch dari Internet';
  }
};

$('setup').onclick = () => {
  show('settings');
  $('anchor').focus();
  try { $('anchor').showPicker(); } catch {} // langsung buka kalender; abaikan kalau browser menolak
};

const isDark = () => (theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
function applyTheme() {
  if (theme) document.documentElement.dataset.theme = theme;
  const d = isDark();
  $('sun').toggleAttribute('hidden', !d); $('moon').toggleAttribute('hidden', d); // SVG tak punya properti .hidden
  $('theme').title = d ? 'Mode terang' : 'Mode gelap';
  $('theme').setAttribute('aria-label', $('theme').title);
}
$('theme').onclick = () => { theme = isDark() ? 'light' : 'dark'; store.set({ theme }); applyTheme(); };
applyTheme();

show('today');
