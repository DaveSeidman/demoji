import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const emojiBySymbol = require('unicode-emoji-json/data-by-emoji.json');
const emojiAnnotations = require('emojibase-data/en/data.json');

const aliases = new Map([
  ['arena', 'stadium'],
  ['bike', 'bicycle'],
  ['bicep', 'flexed biceps'],
  ['biceps', 'flexed biceps'],
  ['ball park', 'stadium'],
  ['ballpark', 'stadium'],
  ['burger', 'hamburger'],
  ['ice skates', 'ice skate'],
  ['theatre', 'performing arts'],
  ['theater', 'performing arts'],
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

  for (const data of emojiAnnotations) {
    addConcept(concepts, data.label, data.emoji, data.label);

    for (const tag of data.tags || []) {
      addConcept(concepts, tag, data.emoji, data.label);
    }
  }

  return concepts;
}

const existingEmojiConcepts = buildExistingEmojiConcepts();
const existingEmojiBySymbol = new Map();
const standardEmojiCatalog = emojiAnnotations.map((data) => ({
  id: data.hexcode,
  emoji: data.emoji,
  name: data.label,
  tags: data.tags || []
}));
const standardEmojiById = new Map();

for (const match of existingEmojiConcepts.values()) {
  existingEmojiBySymbol.set(normalizeEmoji(match.emoji), match);
}

for (const item of standardEmojiCatalog) {
  standardEmojiById.set(item.id, {
    emoji: item.emoji,
    name: item.name,
    concept: normalizeConcept(item.name)
  });
}

function normalizeEmoji(value) {
  return String(value || '').replace(/\uFE0E|\uFE0F/g, '');
}

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
  const aliased = aliases.get(normalized);
  const canonical = aliased || normalized;
  const match = existingEmojiConcepts.get(canonical) || existingEmojiConcepts.get(singularize(canonical));

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
    concept: singularize(canonical),
    reason: ''
  };
}

export function findExistingEmojiSuggestion({ emoji, name }) {
  const byEmoji = existingEmojiBySymbol.get(normalizeEmoji(emoji));

  if (byEmoji) {
    return byEmoji;
  }

  const normalizedName = normalizeConcept(name);

  if (!normalizedName) {
    return null;
  }

  return existingEmojiConcepts.get(normalizedName) || existingEmojiConcepts.get(singularize(normalizedName)) || null;
}

export function findStandardEmojiById(id) {
  return standardEmojiById.get(id) || null;
}

export function getStandardEmojiCatalog() {
  return standardEmojiCatalog;
}
