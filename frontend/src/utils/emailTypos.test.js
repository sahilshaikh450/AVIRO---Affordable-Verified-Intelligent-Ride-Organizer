import { suggestEmailFix } from './emailTypos';

describe('suggestEmailFix', () => {
  it('suggests the right domain for common typos', () => {
    expect(suggestEmailFix('rahul@gmial.com')).toBe('rahul@gmail.com');
    expect(suggestEmailFix('rahul@gmail.con')).toBe('rahul@gmail.com');
    expect(suggestEmailFix('Rahul@Gmail.co')).toBe('rahul@gmail.com');
    expect(suggestEmailFix('neha@icloud.co')).toBe('neha@icloud.com');
  });

  it('leaves correct and college emails alone', () => {
    expect(suggestEmailFix('rahul@gmail.com')).toBeNull();
    expect(suggestEmailFix('rahul@mitwpu.edu.in')).toBeNull();
    expect(suggestEmailFix('rahul@pict.edu')).toBeNull();
  });

  it('ignores incomplete input', () => {
    expect(suggestEmailFix('rahul')).toBeNull();
    expect(suggestEmailFix('rahul@')).toBeNull();
  });
});
