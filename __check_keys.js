const ko = require('./src/messages/ko.json');
const es = require('./src/messages/es.json');

function getKeys(obj, prefix) {
  prefix = prefix || '';
  var keys = [];
  for (var k of Object.keys(obj)) {
    var path = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && Array.isArray(obj[k]) === false) {
      keys = keys.concat(getKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

var koKeys = getKeys(ko);
var esKeys = getKeys(es);
var missing = koKeys.filter(function(k) { return esKeys.indexOf(k) === -1; });
var extra = esKeys.filter(function(k) { return koKeys.indexOf(k) === -1; });

console.log('KO keys: ' + koKeys.length);
console.log('ES keys: ' + esKeys.length);
if (missing.length) console.log('Missing in ES: ' + missing.join(', '));
else console.log('No missing keys');
if (extra.length) console.log('Extra in ES: ' + extra.join(', '));
else console.log('No extra keys');
