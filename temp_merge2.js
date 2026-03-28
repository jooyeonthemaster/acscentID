const fs = require('fs');
const path = require('path');

const ko = JSON.parse(fs.readFileSync('./src/messages/ko.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('./src/messages/es.json', 'utf8'));

console.log('payment keys in es BEFORE:', Object.keys(es.payment));
console.log('mypage.profile in es BEFORE:', es.mypage.profile);

// Check if write worked
if (es.payment.bankTransferShort) {
  console.log('bankTransferShort exists:', es.payment.bankTransferShort);
} else {
  console.log('bankTransferShort does NOT exist yet');
}
