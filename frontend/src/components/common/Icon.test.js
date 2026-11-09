import { stripEmoji, initial } from './Icon';
import { esc } from '../../utils/mapStyle';

test('server text loses its emoji', () => {
  expect(stripEmoji('Booking Confirmed! ✅')).toBe('Booking Confirmed!');
  expect(stripEmoji('🎉 Ride found 🎉')).toBe('Ride found');
  expect(stripEmoji(null)).toBe('');
});

test('avatar initial', () => {
  expect(initial('rahul patil')).toBe('R');
  expect(initial('')).toBe('?');
  expect(initial(undefined)).toBe('?');
});

test('map labels and popups escape user text', () => {
  expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  expect(esc(`a&b "c" 'd'`)).toBe('a&amp;b &quot;c&quot; &#39;d&#39;');
  expect(esc(null)).toBe('');
});

test('Icon accepts an element or number instead of an emoji', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Icon = require('./Icon').default;
  expect(
    renderToStaticMarkup(React.createElement(Icon, { e: React.createElement('b', null, 'car') }))
  ).toBe('<b>car</b>');
  expect(renderToStaticMarkup(React.createElement(Icon, { e: 5 }))).toContain('5');
  expect(renderToStaticMarkup(React.createElement(Icon, { e: '📍' }))).toContain('<svg');
  expect(renderToStaticMarkup(React.createElement(Icon, { e: undefined }))).toBe('');
});
