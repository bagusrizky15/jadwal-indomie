import assert from 'node:assert/strict';
import { statusOf, cyclePos, nextWfh, parseHolidays } from './schedule.js';

const s = (d, a, h = {}) => statusOf(d, a, h);
// anchor Kamis 2026-10-08 = WFH; WFH berikutnya Rabu 14 (hari kerja ke-4)
assert.equal(s('2026-10-08', '2026-10-08'), 'wfh');
assert.deepEqual(['09', '12', '13'].map((d) => s(`2026-10-${d}`, '2026-10-08')), ['wfo', 'wfo', 'wfo']);
assert.equal(s('2026-10-14', '2026-10-08'), 'wfh'); // Rab: hari kerja ke-4
assert.equal(s('2026-10-10', '2026-10-08'), 'libur'); // Sabtu
// libur di Sel 13 -> WFH bergeser ke Kam 15
const h = { '2026-10-13': 'Libur' };
assert.equal(s('2026-10-13', '2026-10-08', h), 'libur');
assert.equal(s('2026-10-14', '2026-10-08', h), 'wfo');
assert.equal(s('2026-10-15', '2026-10-08', h), 'wfh');
// sebelum anchor
assert.equal(s('2026-10-07', '2026-10-08'), 'wfo');
assert.equal(s('2026-10-02', '2026-10-08'), 'wfh'); // Jum 2 = 4 hari kerja sebelum Kam 8
// lintas tahun
assert.equal(s('2027-01-04', '2026-12-31'), 'wfo');
assert.equal(nextWfh('2026-10-08', '2026-10-08', {}), '2026-10-14');
const p = parseHolidays('2026-01-01 Tahun Baru\nngawai\n2026-02-30 x\n2026-03-20');
assert.deepEqual(p.ok, { '2026-01-01': 'Tahun Baru', '2026-03-20': '' });
assert.equal(p.bad.length, 2);
assert.deepEqual(['08','09','12','13'].map((d) => cyclePos(`2026-10-${d}`, '2026-10-08', {})), [0, 1, 2, 3]);
assert.equal(cyclePos('2026-10-10', '2026-10-08', {}), null);
// pola custom: 2 WFH, 2 WFO dari Kam 8 -> Kam,Jum WFH; Sen,Sel WFO; Rab WFH
assert.deepEqual(['08','09','12','13','14'].map((d) => statusOf(`2026-10-${d}`, '2026-10-08', {}, 2, 2)), ['wfh','wfh','wfo','wfo','wfh']);
assert.equal(nextWfh('2026-10-09', '2026-10-08', {}, 2, 2), '2026-10-14');
// 1 WFH, 4 WFO
assert.equal(statusOf('2026-10-14', '2026-10-08', {}, 1, 4), 'wfo');
assert.equal(statusOf('2026-10-15', '2026-10-08', {}, 1, 4), 'wfh');
console.log('ok');
