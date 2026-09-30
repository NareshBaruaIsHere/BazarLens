export const today = () => new Date().toLocaleDateString('en-CA');
export function requireValue(condition, message) { if (!condition) throw new Error(message); }
export function text(value, label, max = 120) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `${label} is required (maximum ${max} characters).`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'Email', 254).toLowerCase();
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 'Enter a valid email address.');
  return result;
}
export function password(value) {
  requireValue(typeof value === 'string' && value.length >= 8 && value.length <= 128, 'Password must contain 8–128 characters.');
  return value;
}
export function url(value) {
  if (!value) return '';
  try { const parsed = new URL(value); requireValue(['https:', 'http:'].includes(parsed.protocol), 'Use an HTTP or HTTPS URL.'); return parsed.href; }
  catch { throw new Error('Use a valid HTTP or HTTPS URL.'); }
}
export function positive(value) {
  const number = Number(value);
  requireValue(Number.isFinite(number) && number > 0 && number <= 1000000, 'Price must be greater than zero and at most 1,000,000.');
  return Math.round(number * 100) / 100;
}
