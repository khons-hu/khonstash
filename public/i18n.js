import { messages } from './messages.js';
export const languages = { en: 'English', sk: 'Slovenčina', hu: 'Magyar', pl: 'Polski', de: 'Deutsch', es: 'Español', cs: 'Čeština' };
const storageKey = 'steam-shelf-language';
export function resolveLanguage(saved, browserLanguages = []) {
  if (Object.hasOwn(languages, saved)) return saved;
  for (const value of browserLanguages) {
    const language = String(value).toLowerCase().split(/[-_]/)[0];
    if (Object.hasOwn(languages, language)) return language;
  }
  return 'en';
}
let saved;
try { saved = globalThis.localStorage?.getItem(storageKey); } catch {}
export let locale = resolveLanguage(saved, globalThis.navigator?.languages || [globalThis.navigator?.language]);
const normalize = value => value.replace(/\s+/g, ' ').trim();
// Only authored literals and template segments enter this function. Interpolated
// source data is inserted afterwards, so names, addresses and notes stay verbatim.
function translateSegment(value) {
  const tokens = [...value.matchAll(/\uE000\d+\uE001/g)].map(match => match[0]);
  const key = normalize(value.replace(/\uE000\d+\uE001/g, '{}'));
  const translated = messages[key]?.[locale];
  if (translated === undefined) return value;
  let index = 0;
  return (value.match(/^\s*/)?.[0] || '') + translated.replace(/\{\}/g, () => tokens[index++] ?? '{}') + (value.match(/\s*$/)?.[0] || '');
}
export function t(input, ...values) {
  const template = Array.isArray(input);
  const source = template ? input.map((part, index) => part + (index < values.length ? `\uE000${index}\uE001` : '')).join('') : String(input);
  let translated = translateSegment(source);
  if (translated === source && /<[a-z]/i.test(source)) {
    translated = source.replace(/(^|>)([^<>]+)(?=<|$)/g, (_, start, text) => start + translateSegment(text))
      .replace(/(placeholder|aria-label|title)="([^"]*)"/g, (_, name, text) => `${name}="${translateSegment(text)}"`);
  }
  return template ? translated.replace(/\uE000(\d+)\uE001/g, (_, index) => String(values[Number(index)])) : translated;
}
export function errorText(error) {
  if (error?.name === 'SyntaxError') return t('Invalid backup file.');
  const message = typeof error === 'string' ? error : error?.message;
  if (messages[message]) return t(message);
  for (const [key, entry] of Object.entries(messages)) { if (Object.values(entry).includes(message)) return t(key); }
  const unavailable = /^Polymarket is unavailable \((\d+)\)\. Try again shortly\.$/.exec(message || '');
  if (unavailable) return t`Polymarket is unavailable (${unavailable[1]}). Try again shortly.`;
  return t('Something went wrong. Please try again.');
}
export const number = (value, options = {}) => new Intl.NumberFormat(locale, options).format(value);
export const dateTime = value => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const time = value => new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
export function setLanguage(value) {
  locale = resolveLanguage(value);
  try { globalThis.localStorage?.setItem(storageKey, locale); } catch {}
  if (typeof document !== 'undefined') {
    applyStatic();
    document.dispatchEvent(new CustomEvent('languagechange'));
  }
}
function applyStatic() {
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  for (const attribute of ['aria-label', 'title', 'placeholder']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`))));
  }
  const selector = document.querySelector('#language');
  if (selector) selector.value = locale;
}
export function initLanguage() {
  const selector = document.querySelector('#language');
  for (const [code, name] of Object.entries(languages)) selector.add(new Option(name, code));
  selector.addEventListener('change', event => setLanguage(event.target.value));
  applyStatic();
}

export function refreshText(text) {
  for (const [key, entry] of Object.entries(messages)) {
    if (!key.includes('{}') && Object.values(entry).includes(text)) return t(key);
  }
  return text;
}
