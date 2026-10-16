import { statusOf, cyclePos, nextWfh, parseHolidays, todayIso, toNum, toIso, isOff, isWeekend, isValidIso } from './schedule.js';
import { LANGS, STR } from './i18n.js';

const $ = (id) => document.getElementById(id);

// chrome.storage di ekstensi; localStorage supaya popup.html bisa dibuka langsung di browser untuk uji.
const store = globalThis.chrome?.storage?.sync ?? {
  get: async () => JSON.parse(localStorage.getItem('jadwal') || '{}'),
  set: async (v) => localStorage.setItem('jadwal', JSON.stringify({ ...JSON.parse(localStorage.getItem('jadwal') || '{}'), ...v })),
};

let { anchor = '', holidays = {}, theme = '', wfh = 1, wfo = 3, lang = 'id' } = await store.get(['anchor', 'holidays', 'theme', 'wfh', 'wfo', 'lang']);
if (!(lang in STR)) lang = 'id';

const t = (key, ...args) => {
  const v = STR[lang][key] ?? STR.id[key];
  return typeof v === 'function' ? v(...args) : v;
};
const label = (st) => (st === 'libur' ? t('libur') : st.toUpperCase()); // WFO/WFH tidak diterjemahkan
const dt = (iso, opts) => new Intl.DateTimeFormat(LANGS[lang].locale, { timeZone: 'UTC', ...opts }).format(new Date(toNum(iso) * 864e5));
const fmt = (iso) => dt(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dow = (iso) => dt(iso, { weekday: 'short' });
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
  if (!anchor && !$('month').hidden) $('warn').textContent = t('warnAnchor');
  else if (!hasHolidays(viewYear)) $('warn').textContent = t('warnHolidays', viewYear);
  else $('warn').hidden = true;
  if (!anchor && $('month').hidden) $('warn').hidden = true; // kartu hari ini / pengaturan sudah mengarahkan

  renderToday(); renderMonth(); renderSettings();
}

function renderToday() {
  const p = anchor ? cyclePos(today, anchor, holidays, wfh, wfo) : undefined;
  const st = anchor ? statusOf(today, anchor, holidays, wfh, wfo) : '';
  $('card').className = anchor ? `${st}${today in holidays ? ' holiday' : ''}` : 'unset';
  $('card-date').textContent = fmt(today);
  $('card-status').textContent = st ? label(st) : t('unset');
  $('setup').hidden = !!anchor;
  const nx = anchor && nextWfh(today, anchor, holidays, wfh, wfo);
  const gap = nx ? toNum(nx) - toNum(today) : 0;
  $('card-sub').textContent = p === undefined ? t('unsetSub') : p === null ? t('paused') : p < wfh ? (wfh > 1 ? t('wfhNth', p + 1, wfh) : t('wfhDay')) : t('wfoNth', p - wfh + 1, wfo);
  // bisa digeser: 2 minggu ke belakang, 6 minggu ke depan, termasuk Sabtu/Minggu
  const days = Array.from({ length: 56 }, (_, i) => toIso(toNum(today) - 14 + i));
  $('strip').replaceChildren(...(anchor ? days : []).map((iso) => {
    const s = statusOf(iso, anchor, holidays, wfh, wfo);
    const kind = iso in holidays ? 'libur holiday' : isWeekend(iso) ? 'weekend' : s;
    const chip = document.createElement('div');
    chip.className = `chip ${kind}${iso === today ? ' today' : ''}`;
    if (iso in holidays) chip.dataset.tip = iso;
    const d = document.createElement('b');
    d.textContent = +iso.slice(8);
    chip.append(dow(iso), d, label(s));
    return chip;
  }));
  const chip = $('strip').querySelector('.today');
  if (chip) $('strip').scrollLeft = chip.offsetLeft; // mulai dari hari ini
  $('card-next').replaceChildren();
  if (nx) $('card-next').append(t('nextWfh'), Object.assign(document.createElement('b'), { textContent: fmt(nx) }), gap === 1 ? t('tomorrow') : t('inDays', gap));
}

function renderMonth() {
  const mm = String(month + 1).padStart(2, '0');
  $('month-title').textContent = dt(`${year}-${mm}-01`, { month: 'long', year: 'numeric' });
  // ponytail: rentang tetap tahun lalu .. 2 tahun ke depan; libur di luar itu toh belum terbit
  $('prev').disabled = year === Y0 - 1 && month === 0;
  $('next').disabled = year === Y0 + 2 && month === 11;
  $('goto-today').hidden = year === Y0 && month === +today.slice(5, 7) - 1;

  const grid = $('grid');
  const first = toNum(`${year}-${mm}-01`);
  const lead = (new Date(first * 864e5).getUTCDay() + 6) % 7; // Senin di kolom pertama
  const monday = toNum('2024-01-01'); // hari Senin apa saja, untuk nama hari
  grid.replaceChildren(...Array.from({ length: 7 }, (_, i) => Object.assign(document.createElement('div'), { className: 'dow', textContent: dow(toIso(monday + i)) })));
  for (let i = 0; i < lead; i++) grid.append(Object.assign(document.createElement('div'), { className: 'cell blank' }));
  const count = { wfo: 0, wfh: 0, libur: 0 };
  for (let n = first; toIso(n).startsWith(`${year}-${mm}`); n++) {
    const iso = toIso(n);
    const st = anchor ? statusOf(iso, anchor, holidays, wfh, wfo) : (isOff(iso, holidays) ? 'libur' : '');
    const weekend = isWeekend(iso);
    if (st && !weekend) count[st]++;
    const c = document.createElement('div');
    c.className = `cell ${iso in holidays ? 'libur' : weekend ? 'weekend' : st}${iso === today ? ' today' : ''}`; // libur di weekend tetap merah
    if (iso in holidays) c.dataset.tip = iso;
    else if (weekend || st) c.title = label(weekend ? 'libur' : st);
    const num = document.createElement('b');
    num.textContent = +iso.slice(8);
    c.append(num);
    grid.append(c);
  }
  $('summary').hidden = !anchor;
  $('summary').replaceChildren(...['wfh', 'wfo', 'libur'].flatMap((k) =>
    [Object.assign(document.createElement('i'), { className: `k ${k}` }), `${count[k]} ${label(k)}`]));
}

function renderSettings() {
  $('anchor').value = anchor;
  $('wfh').value = wfh;
  $('wfo').value = wfo;
  const keys = Object.keys(holidays).sort();
  if (!keys.length) return $('holidays').replaceChildren(Object.assign(document.createElement('li'), { className: 'empty', textContent: t('empty') }));
  $('holidays').replaceChildren(...keys.map((iso) => {
    const li = document.createElement('li');
    const txt = document.createElement('span');
    const small = document.createElement('small');
    small.textContent = holidays[iso] || t('libur');
    txt.append(fmt(iso), small);
    const x = document.createElement('button');
    x.textContent = '✕'; x.setAttribute('aria-label', t('remove', iso));
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
    msg(t('badAnchor'), false);
    e.target.value = anchor;
    return;
  }
  anchor = v; save(); msg(t('saved'), true); render();
};

for (const id of ['wfh', 'wfo']) $(id).onchange = (e) => {
  const v = +e.target.value;
  if (!Number.isInteger(v) || v < 1 || v > 20) { msg(t('badNumber'), false); e.target.value = id === 'wfh' ? wfh : wfo; return; }
  if (id === 'wfh') wfh = v; else wfo = v;
  save(); msg(t('saved'), true); render();
};

$('add').onclick = () => {
  const { ok, bad } = parseHolidays($('paste').value);
  Object.assign(holidays, ok);
  save();
  if (anchor && isOff(anchor, holidays)) msg(t('anchorOff'), false);
  else if (bad.length) msg(t('addedBad', Object.keys(ok).length, bad.join(' | ')), false);
  else msg(t('added', Object.keys(ok).length), true);
  $('paste').value = bad.join('\n');
  render();
};

// Tooltip libur: satu elemen fixed, supaya tidak terpotong overflow strip.
const tip = $('tip');
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return (tip.hidden = true);
  const iso = el.dataset.tip;
  tip.replaceChildren(Object.assign(document.createElement('b'), { textContent: holidays[iso] || t('libur') }), fmt(iso));
  tip.hidden = false;
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
  tip.style.top = `${r.top - h - 6 < 4 ? r.bottom + 6 : r.top - h - 6}px`; // di atas; kalau mentok, di bawah
});
document.documentElement.addEventListener('mouseleave', () => (tip.hidden = true));
$('strip').addEventListener('scroll', () => (tip.hidden = true));

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
  btn.disabled = true; btn.textContent = t('fetching');
  try {
    const res = await fetch(HOLIDAY_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const lines = Object.keys(data)
      .filter((d) => isValidIso(d) && +d.slice(0, 4) >= Y0 && +d.slice(0, 4) <= Y0 + 1 && !(d in holidays))
      .sort().map((d) => `${d} ${data[d].summary ?? ''}`.trim());
    if (!lines.length) return msg(t('noNew', Y0, Y0 + 1), true);
    $('paste').value = [$('paste').value.trim(), ...lines].filter(Boolean).join('\n');
    $('paste').rows = 10;
    msg(t('loaded', lines.length), true);
  } catch (e) {
    msg(t('fetchFail', e.message), false);
  } finally {
    btn.disabled = false; btn.textContent = t('fetch');
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
  $('theme').title = t(d ? 'lightMode' : 'darkMode');
  $('theme').setAttribute('aria-label', $('theme').title);
}
$('theme').onclick = () => { theme = isDark() ? 'light' : 'dark'; store.set({ theme }); applyTheme(); };

// Teks statis di popup.html ditandai data-i18n (isi), data-i18n-label (aria-label), data-i18n-title (title + aria-label).
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  $('paste').placeholder = t('pastePh');
  $('lang').value = lang;
  applyTheme();
}
$('lang').replaceChildren(...Object.entries(LANGS).map(([code, l]) => new Option(`${l.flag}  ${l.name}`, code)));
$('lang').onchange = (e) => { lang = e.target.value; store.set({ lang }); applyLang(); render(); };
applyLang();

show('today');
