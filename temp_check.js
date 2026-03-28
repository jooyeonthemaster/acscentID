const ko = require('./src/messages/ko.json');
const es = require('./src/messages/es.json');

for (const key of Object.keys(ko.mypage)) {
  const koType = typeof ko.mypage[key];
  const esVal = es.mypage[key];
  const esType = typeof esVal;
  if (esVal !== undefined && koType !== esType) {
    console.log('Type mismatch mypage.' + key + ': ko=' + koType + ' es=' + esType);
  }
}
