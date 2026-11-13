import { formatPlace } from './geo';

describe('formatPlace', () => {
  it('shows the lane, the colony and the area', () => {
    expect(
      formatPlace({
        road: 'Lane 5',
        neighbourhood: 'Mayur Colony',
        suburb: 'Kothrud',
        city: 'Pune',
        state: 'Maharashtra',
      })
    ).toBe('Lane 5, Mayur Colony, Kothrud');
  });

  it('uses a landmark when there is no road name', () => {
    expect(
      formatPlace({ amenity: 'MIT World Peace University', suburb: 'Kothrud', city: 'Pune' })
    ).toBe('MIT World Peace University, Kothrud');
  });

  it('adds the city when only one part is known', () => {
    expect(formatPlace({ suburb: 'Hinjewadi', city: 'Pune' })).toBe('Hinjewadi, Pune');
  });

  it('does not repeat the same name', () => {
    expect(formatPlace({ road: 'Karve Road', neighbourhood: 'Kothrud', suburb: 'Kothrud' })).toBe(
      'Karve Road, Kothrud'
    );
  });

  it('returns null when nothing useful comes back', () => {
    expect(formatPlace(undefined)).toBeNull();
    expect(formatPlace({ country: 'India' })).toBeNull();
  });
});
