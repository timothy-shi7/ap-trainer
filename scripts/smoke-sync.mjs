import LZString from 'lz-string';

const progress = {
  version: 1,
  streak: { current: 3, best: 5, lastSprintDate: '2026-03-10', shieldAvailable: true },
  questions: {
    'mech-kin-01': { boxLevel: 2, nextReview: 1770000000000, attempts: 4, correct: 3 },
    'mech-rot-01': { boxLevel: 1, nextReview: 0, attempts: 1, correct: 0 },
  },
};

const json = JSON.stringify(progress);
const payload = LZString.compressToEncodedURIComponent(json);
console.log('payload length:', payload.length);
console.log('url-safe (no + / =):', !/[+/=]/.test(payload));

const url = `https://example.com/#sync=${payload}`;
const hashIdx = url.indexOf('#sync=');
const extracted = url.slice(hashIdx + '#sync='.length);

const back = LZString.decompressFromEncodedURIComponent(extracted);
if (back !== json) {
  console.error('FAIL round-trip mismatch');
  process.exit(1);
}
console.log('ok   url round-trip');

// bare payload
const back2 = LZString.decompressFromEncodedURIComponent(payload);
console.log('ok   bare payload round-trip:', back2 === json);

// corruption handling
const corrupt = LZString.decompressFromEncodedURIComponent('!!!!not-valid!!!!');
console.log('corrupt decodes to falsy:', !corrupt);