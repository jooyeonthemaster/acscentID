const fs = require('fs');
const ko = JSON.parse(fs.readFileSync('./src/messages/ko.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('./src/messages/es.json', 'utf8'));

function findMissing(koObj, esObj, path) {
  const missing = [];
  for (const key of Object.keys(koObj)) {
    const currentPath = path ? path + '.' + key : key;
    if (!(key in esObj)) {
      missing.push(currentPath);
    } else if (typeof koObj[key] === 'object' && !Array.isArray(koObj[key]) && typeof esObj[key] === 'object' && !Array.isArray(esObj[key])) {
      missing.push(...findMissing(koObj[key], esObj[key], currentPath));
    }
  }
  return missing;
}

const stillMissing = findMissing(ko, es, '');
if (stillMissing.length > 0) {
  console.log('Still missing:', stillMissing.length);
  stillMissing.forEach(k => console.log(' -', k));
} else {
  console.log('All keys synced successfully! No missing keys.');
}

// Also check type mismatches
function findTypeMismatches(koObj, esObj, path) {
  const mismatches = [];
  for (const key of Object.keys(koObj)) {
    const currentPath = path ? path + '.' + key : key;
    if (key in esObj) {
      const koIsObj = typeof koObj[key] === 'object' && !Array.isArray(koObj[key]);
      const esIsObj = typeof esObj[key] === 'object' && !Array.isArray(esObj[key]);
      const koIsArr = Array.isArray(koObj[key]);
      const esIsArr = Array.isArray(esObj[key]);

      if (koIsObj && !esIsObj) {
        mismatches.push(currentPath + ' (ko=object, es=' + typeof esObj[key] + ')');
      } else if (koIsArr && !esIsArr) {
        mismatches.push(currentPath + ' (ko=array, es=' + typeof esObj[key] + ')');
      } else if (!koIsObj && !koIsArr && (esIsObj || esIsArr)) {
        mismatches.push(currentPath + ' (ko=' + typeof koObj[key] + ', es=object/array)');
      }
    }
  }
  return mismatches;
}

const mismatches = findTypeMismatches(ko, es, '');
if (mismatches.length > 0) {
  console.log('\nType mismatches:', mismatches.length);
  mismatches.forEach(m => console.log(' -', m));
} else {
  console.log('No type mismatches.');
}
