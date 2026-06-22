// Nigerian public holidays.
//
// Fixed-date holidays are generated for any requested year. The movable holidays
// (Good Friday / Easter Monday and the Islamic Eids, which shift each year) are listed
// per-year and are approximate — official dates are confirmed closer to the day. Extend
// the MOVABLE table as new years are confirmed.

export interface HolidaySeed {
  name: string;
  date: string; // YYYY-MM-DD
}

const pad = (n: number) => String(n).padStart(2, '0');

const FIXED: { name: string; month: number; day: number }[] = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Workers' Day", month: 5, day: 1 },
  { name: 'Democracy Day', month: 6, day: 12 },
  { name: 'Independence Day', month: 10, day: 1 },
  { name: 'Christmas Day', month: 12, day: 25 },
  { name: 'Boxing Day', month: 12, day: 26 },
];

const MOVABLE: Record<number, HolidaySeed[]> = {
  2025: [
    { name: 'Eid-el-Fitr', date: '2025-03-31' },
    { name: 'Good Friday', date: '2025-04-18' },
    { name: 'Easter Monday', date: '2025-04-21' },
    { name: 'Eid-el-Kabir', date: '2025-06-06' },
    { name: 'Eid-el-Maulud', date: '2025-09-05' },
  ],
  2026: [
    { name: 'Eid-el-Fitr', date: '2026-03-20' },
    { name: 'Good Friday', date: '2026-04-03' },
    { name: 'Easter Monday', date: '2026-04-06' },
    { name: 'Eid-el-Kabir', date: '2026-05-27' },
    { name: 'Eid-el-Maulud', date: '2026-08-25' },
  ],
  2027: [
    { name: 'Eid-el-Fitr', date: '2027-03-10' },
    { name: 'Good Friday', date: '2027-03-26' },
    { name: 'Easter Monday', date: '2027-03-29' },
    { name: 'Eid-el-Kabir', date: '2027-05-17' },
    { name: 'Eid-el-Maulud', date: '2027-08-15' },
  ],
};

/** Public holidays for Nigeria for a given year (fixed + known movable dates). */
export const getNigerianHolidays = (year: number): HolidaySeed[] => {
  const fixed = FIXED.map((f) => ({ name: f.name, date: `${year}-${pad(f.month)}-${pad(f.day)}` }));
  const movable = MOVABLE[year] || [];
  return [...fixed, ...movable].sort((a, b) => a.date.localeCompare(b.date));
};
