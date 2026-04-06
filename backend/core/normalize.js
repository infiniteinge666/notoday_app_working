'use strict';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractUrls(text) {
  return unique((text.match(/https?:\/\/[^\s)]+/gi) || []).map(x => x.trim()));
}

function extractEmails(text) {
  return unique((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()));
}

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function extractDomainCandidates(text) {
  const urls = extractUrls(text);
  const urlHosts = urls.map(hostFromUrl).filter(Boolean);

  const plainDomains = (text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) || [])
    .map(x => x.toLowerCase())
    .filter(x => !x.includes('@'));

  return unique([...urlHosts, ...plainDomains]);
}

function normalizeRaw(input) {
  const original = String(input || '').trim();
  const text = original
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    original,
    text,
    lower: text.toLowerCase(),
    urls: extractUrls(text),
    emails: extractEmails(text),
    domains: extractDomainCandidates(text)
  };
}

module.exports = {
  normalizeRaw,
  extractUrls,
  extractEmails,
  extractDomainCandidates
};