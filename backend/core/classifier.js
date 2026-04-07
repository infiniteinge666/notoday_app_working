'use strict';

function classifyScam(reasons = []) {
  const text = reasons.join(' ').toLowerCase();

  if (/otp|pin|cvv|password/.test(text)) return 'Credential Theft';
  if (/bank|payment|eft|account/.test(text)) return 'Payment Fraud';
  if (/investment|crypto|returns|profit/.test(text)) return 'Investment Scam';
  if (/parcel|delivery|package/.test(text)) return 'Delivery Scam';
  if (/invoice|supplier|bank details/.test(text)) return 'Invoice Fraud';

  return 'Social Engineering';
}

module.exports = {
  classifyScam
};