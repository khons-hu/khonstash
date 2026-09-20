import test from 'node:test';
import assert from 'node:assert/strict';
import { languages, resolveLanguage, setLanguage, locale, t, number, dateTime, errorText } from '../public/i18n.js';
import { messages } from '../public/messages.js';

test('locale negotiation uses persisted supported choice, browser languages, then English', () => {
  assert.equal(resolveLanguage('de', ['sk-SK']), 'de');
  assert.equal(resolveLanguage('invalid', ['fr-FR', 'hu-HU']), 'hu');
  assert.equal(resolveLanguage(null, ['cs-CZ']), 'cs');
  assert.equal(resolveLanguage(null, ['zz']), 'en');
  assert.equal(resolveLanguage('toString', ['fr']), 'en');
});
test('all catalogs have seven languages and preserve interpolation slots', () => {
  for (const [key, entry] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(entry).sort(), Object.keys(languages).sort(), key);
    for (const [language, text] of Object.entries(entry)) {
      assert.ok(text.trim(), `${language}: ${key}`);
      assert.equal((text.match(/\{\}/g)||[]).length, (key.match(/\{\}/g)||[]).length, `${language}: ${key}`);
    }
  }
});
test('authored HTML is translated before source data is inserted', () => {
  const key=Object.keys(messages).find(key=>!key.includes('{}')&&key.length>15&&messages[key].sk!==key);
  setLanguage('sk');
  const literal=Object.assign(['<h2>'+key+'</h2><p>','</p>'], {raw: []});
  assert.equal(t(literal, key), '<h2>'+messages[key].sk+'</h2><p>'+key+'</p>');
  const source='Wallet <script>not executed</script> & notes';
  assert.ok(t(literal, source).endsWith('<p>'+source+'</p>'));
  setLanguage('en');
  assert.equal(t(literal, key),'<h2>'+key+'</h2><p>'+key+'</p>');
});
test('templates preserve dynamic values and localize multiple slots', () => {
  const key=Object.keys(messages).find(key=>(key.match(/\{\}/g)||[]).length>=2);
  const parts=key.split('{}');
  const values=parts.slice(1).map((_,i)=>`SOURCE-${i}`);
  for(const language of Object.keys(languages)) {
    setLanguage(language);
    let i=0;
    assert.equal(t(parts,...values),messages[key][language].replace(/\{\}/g,()=>values[i++]));
  }
});
test('locale controls numbers and dates without changing input data', () => {
  for(const language of Object.keys(languages)) {
    setLanguage(language);
    assert.equal(locale,language);
    assert.equal(number(1234.5),new Intl.NumberFormat(language).format(1234.5));
    assert.equal(dateTime('2026-09-20T14:05:00Z'),new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short'}).format(new Date('2026-09-20T14:05:00Z')));
  }
});
test('known validation errors localize and unknown errors get a local fallback', () => {
  setLanguage('sk');
  assert.equal(errorText(new SyntaxError('Unexpected token')), messages['Invalid backup file.'].sk);
  assert.equal(errorText(new Error('untrusted upstream detail')),messages['Something went wrong. Please try again.'].sk);
  assert.equal(errorText(new Error(messages['Something went wrong. Please try again.'].sk)),messages['Something went wrong. Please try again.'].sk);
});
