import { filterColleges } from './CollegePicker';

const LIST = [
  'MIT World Peace University (MIT-WPU)',
  'Pune Institute of Computer Technology (PICT)',
  'COEP Technological University',
  'Symbiosis Institute of Technology (SIT)',
];

describe('filterColleges', () => {
  it('shows every college when nothing is typed', () => {
    expect(filterColleges('', LIST)).toEqual(LIST);
  });

  it('finds a college by its short name, ignoring case and punctuation', () => {
    expect(filterColleges('pict', LIST)).toEqual(['Pune Institute of Computer Technology (PICT)']);
    expect(filterColleges('mit wpu', LIST)).toEqual(['MIT World Peace University (MIT-WPU)']);
  });

  it('puts names that start with the text first', () => {
    expect(filterColleges('co', LIST)[0]).toBe('COEP Technological University');
  });

  it('returns nothing for an unknown college', () => {
    expect(filterColleges('xyz college', LIST)).toEqual([]);
  });
});
