const fs = require('fs');
const ko = JSON.parse(fs.readFileSync('c:/Users/jooye/Desktop/PPUDUCKXSPOT/src/messages/ko.json', 'utf8'));
const ja = JSON.parse(fs.readFileSync('c:/Users/jooye/Desktop/PPUDUCKXSPOT/src/messages/ja.json', 'utf8'));

function countLeaves(obj) {
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      count += countLeaves(v);
    } else {
      count++;
    }
  }
  return count;
}

function getMissingPaths(source, target, prefix) {
  prefix = prefix || '';
  const missing = [];
  for (const [k, v] of Object.entries(source)) {
    const path = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      if (target[k] === undefined || typeof target[k] !== 'object') {
        missing.push(path + ' (entire object missing)');
      } else {
        missing.push(...getMissingPaths(v, target[k], path));
      }
    } else {
      if (target[k] === undefined) {
        missing.push(path);
      }
    }
  }
  return missing;
}

const koCount = countLeaves(ko);
const jaCount = countLeaves(ja);
const missing = getMissingPaths(ko, ja);

console.log('ko.json leaf keys: ' + koCount);
console.log('ja.json leaf keys: ' + jaCount);
console.log('Missing keys in ja.json: ' + missing.length);
if (missing.length > 0) {
  console.log('Missing paths:');
  missing.forEach(p => console.log('  - ' + p));
}
