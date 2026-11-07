import { dayOf, timeOf, formatWhen, isPast } from './when';

const at = (daysFromNow, h = 9, m = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(h, m, 0, 0);
  return d;
};

describe('dates in words', () => {
  test('today, tomorrow and yesterday', () => {
    expect(dayOf(at(0))).toBe('Today');
    expect(dayOf(at(1))).toBe('Tomorrow');
    expect(dayOf(at(-1))).toBe('Yesterday');
  });

  test('other days show weekday, date and month', () => {
    expect(dayOf(at(5))).toMatch(/^[A-Z][a-z]{2},? \d{1,2} [A-Z][a-z]{2}/);
  });

  test('time is like 9:30 am', () => {
    expect(timeOf(at(0, 9, 30)).toLowerCase()).toMatch(/^9:30\s?am$/);
    expect(timeOf(at(0, 17, 5)).toLowerCase()).toMatch(/^5:05\s?pm$/);
  });

  test('formatWhen joins day and time', () => {
    expect(formatWhen(at(1, 9, 30)).toLowerCase()).toMatch(/^tomorrow, 9:30\s?am$/);
  });

  test('isPast with a grace period', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600e3);
    expect(isPast(twoHoursAgo)).toBe(true);
    expect(isPast(twoHoursAgo, 3)).toBe(false);
    expect(isPast(new Date(Date.now() + 60e3))).toBe(false);
  });
});
