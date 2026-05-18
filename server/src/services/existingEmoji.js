import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const emojiBySymbol = require('unicode-emoji-json/data-by-emoji.json');

const aliases = new Map([
  ['bike', 'bicycle'],
  ['bicep', 'flexed biceps'],
  ['biceps', 'flexed biceps'],
  ['burger', 'hamburger'],
  ['ice skates', 'ice skate'],
  ['plane', 'airplane'],
  ['roller skates', 'roller skate'],
  ['smiley', 'smiling face']
]);

function singularize(value) {
  if (value.endsWith('ies')) {
    return `${value.slice(0, -3)}y`;
  }

  if (value.endsWith('ses')) {
    return value.slice(0, -2);
  }

  if (value.endsWith('s') && !value.endsWith('ss')) {
    return value.slice(0, -1);
  }

  return value;
}

function addConcept(concepts, key, emoji, name) {
  const normalized = normalizeConcept(key);

  if (!normalized) {
    return;
  }

  concepts.set(normalized, {
    emoji,
    name,
    concept: normalized
  });

  const singular = singularize(normalized);

  if (singular !== normalized && !concepts.has(singular)) {
    concepts.set(singular, {
      emoji,
      name,
      concept: singular
    });
  }
}

function buildExistingEmojiConcepts() {
  const concepts = new Map();

  for (const [emoji, data] of Object.entries(emojiBySymbol)) {
    addConcept(concepts, data.name, emoji, data.name);
    addConcept(concepts, data.slug?.replace(/_/g, ' '), emoji, data.name);
  }

  return concepts;
}

const existingEmojiConcepts = buildExistingEmojiConcepts();

export function normalizeConcept(value) {
  return String(value)
    .toLowerCase()
    .replace(/['"“”‘’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function findExistingEmojiConcept(value) {
  const normalized = normalizeConcept(value);
  const canonical = aliases.get(normalized) || singularize(normalized);
  const match = existingEmojiConcepts.get(canonical);

  if (match) {
    return {
      exists: true,
      concept: match.concept,
      emoji: match.emoji,
      unicodeName: match.name,
      reason: `This appears to already exist as ${match.emoji} ${match.name}.`
    };
  }

  return {
    exists: false,
    concept: canonical,
    reason: ''
  };
}
