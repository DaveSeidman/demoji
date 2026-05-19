import OpenAI from 'openai';
import { env } from '../config/env.js';
import { findStandardEmojiById, getStandardEmojiCatalog } from './existingEmoji.js';
import { logError, logInfo } from './logger.js';

const openai = env.openaiApiKey
  ? new OpenAI({
      apiKey: env.openaiApiKey
    })
  : null;

function cleanPoolCandidates(poolCandidates) {
  return poolCandidates.map((demoji) => ({
    id: String(demoji._id),
    prompt: demoji.prompt,
    description: demoji.description || '',
    votes: demoji.votes || 0
  }));
}

const standardCatalog = getStandardEmojiCatalog().map((item) => ({
  id: item.id,
  emoji: item.emoji,
  name: item.name,
  tags: item.tags.slice(0, 12)
}));

function createSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['standard', 'pool'],
    properties: {
      standard: {
        type: 'object',
        additionalProperties: false,
        required: ['isMatch', 'id', 'emoji', 'name', 'confidence', 'reason'],
        properties: {
          isMatch: { type: 'boolean' },
          id: { type: 'string' },
          emoji: { type: 'string' },
          name: { type: 'string' },
          confidence: { type: 'number' },
          reason: { type: 'string' }
        }
      },
      pool: {
        type: 'object',
        additionalProperties: false,
        required: ['isMatch', 'id', 'prompt', 'confidence', 'reason'],
        properties: {
          isMatch: { type: 'boolean' },
          id: { type: 'string' },
          prompt: { type: 'string' },
          confidence: { type: 'number' },
          reason: { type: 'string' }
        }
      }
    }
  };
}

export async function suggestSemanticEmojiMatch({ prompt, poolCandidates = [] }) {
  if (!openai) {
    return null;
  }

  const startedAt = Date.now();
  const pool = cleanPoolCandidates(poolCandidates);

  try {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_completion_tokens: 420,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'emoji_match_suggestion',
          strict: true,
          schema: createSchema()
        }
      },
      messages: [
        {
          role: 'system',
          content: [
            'You are a strict preflight checker for an emoji generation site.',
            'Given a requested concept, first decide whether one of the supplied standard Unicode emoji candidates is similar enough that a user should use it instead.',
            'Use common emoji keyboard search behavior, names, aliases, tags, spelling variants, and synonyms.',
            'Only mark standard.isMatch true when a candidate from standardCatalog clearly covers the requested concept.',
            'When standard.isMatch is true, standard.id must exactly match an id from standardCatalog.',
            'If a standard emoji is close enough, do not use the pool match.',
            'Only consider the supplied pool if no standard emoji is close enough.',
            'If nothing is close enough, return both matches as false.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            requestedConcept: prompt,
            standardExamples: [
              { input: 'ball park', match: '🏟️ stadium' },
              { input: 'baseball field', match: '🏟️ stadium' },
              { input: 'theatre', match: '🎭 performing arts' },
              { input: 'biceps', match: '💪 flexed biceps' }
            ],
            standardCatalog,
            pool
          })
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const standardMatch =
      parsed.standard?.isMatch && parsed.standard.confidence >= 0.72
        ? findStandardEmojiById(parsed.standard.id)
        : null;

    const poolMatch =
      !standardMatch && parsed.pool?.isMatch && parsed.pool.confidence >= 0.78
        ? poolCandidates.find((demoji) => String(demoji._id) === parsed.pool.id)
        : null;

    logInfo('emoji.semantic_match.success', {
      prompt,
      model: env.openaiModel,
      standardMatch: Boolean(standardMatch),
      poolMatch: Boolean(poolMatch),
      elapsedMs: Date.now() - startedAt
    });

    return {
      standardMatch,
      poolMatch,
      raw: parsed
    };
  } catch (error) {
    logError('emoji.semantic_match.failed', error, {
      prompt,
      model: env.openaiModel,
      elapsedMs: Date.now() - startedAt
    });

    return null;
  }
}
