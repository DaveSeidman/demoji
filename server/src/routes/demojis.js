import express from 'express';
import slugify from 'slugify';
import { Demoji } from '../models/Demoji.js';
import { findExistingEmojiConcept, normalizeConcept } from '../services/existingEmoji.js';
import { generateDemojiImage } from '../services/fal.js';
import { logError, logInfo } from '../services/logger.js';
import { suggestSemanticEmojiMatch } from '../services/semanticEmojiMatch.js';

export const demojisRouter = express.Router();

function makeSlug(prompt) {
  return slugify(normalizeConcept(prompt), {
    lower: true,
    strict: true,
    trim: true
  });
}

function getFingerprint(req) {
  return req.headers['x-voter-id'] || req.ip || 'anonymous';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSubmissionPayload(body) {
  return {
    prompt: String(body.prompt || '').trim(),
    description: String(body.description || '').trim(),
    styleSet: String(body.styleSet || 'apple').trim(),
    refinement: String(body.refinement || '').trim(),
    imageUrl: String(body.imageUrl || '').trim(),
    generationModel: String(body.generationModel || '').trim()
  };
}

function validatePrompt(prompt) {
  if (prompt.length < 2 || prompt.length > 120) {
    return 'Use a prompt between 2 and 120 characters.';
  }

  return '';
}

async function getAvailability(prompt) {
  const slug = makeSlug(prompt);

  logInfo(`user requested "${prompt}", first checking emoji`, {
    prompt,
    slug
  });

  logInfo('emoji.availability.start', {
    prompt,
    slug,
    step: 'checking_standard_emoji_exact'
  });

  const existingStandard = findExistingEmojiConcept(prompt);

  if (existingStandard.exists) {
    logInfo('emoji.availability.standard_exact_match', {
      prompt,
      slug,
      emoji: existingStandard.emoji,
      unicodeName: existingStandard.unicodeName
    });

    return {
      slug,
      canGenerate: false,
      status: 409,
      message: 'That idea appears to already exist as a standard emoji.',
      existingStandard
    };
  }

  logInfo('emoji.availability.check_pool_exact', {
    prompt,
    slug
  });

  const existingSubmission = await Demoji.findOne({ slug });

  if (existingSubmission) {
    logInfo('emoji.availability.pool_exact_match', {
      prompt,
      slug,
      existingId: existingSubmission._id
    });

    return {
      slug,
      canGenerate: false,
      status: 409,
      message: 'That idea is already in the voting pool.',
      existingSubmission
    };
  }

  logInfo('emoji.availability.check_semantic', {
    prompt,
    slug,
    step: 'checking_standard_emoji_then_pool_semantic'
  });

  const poolCandidates = await Demoji.find({})
    .sort({ votes: -1, createdAt: -1 })
    .limit(80)
    .select('prompt description votes')
    .lean();
  const semanticMatch = await suggestSemanticEmojiMatch({ prompt, poolCandidates });

  if (semanticMatch?.standardMatch) {
    const { standardMatch } = semanticMatch;

    logInfo('emoji.availability.standard_semantic_match', {
      prompt,
      slug,
      emoji: standardMatch.emoji,
      unicodeName: standardMatch.name
    });

    return {
      slug,
      canGenerate: false,
      status: 409,
      message: 'That idea appears to already exist as a standard emoji.',
      existingStandard: {
        exists: true,
        concept: standardMatch.concept,
        emoji: standardMatch.emoji,
        unicodeName: standardMatch.name,
        reason: `This appears to already exist as ${standardMatch.emoji} ${standardMatch.name}.`
      }
    };
  }

  if (semanticMatch?.poolMatch) {
    logInfo('emoji.availability.pool_semantic_match', {
      prompt,
      slug,
      existingId: semanticMatch.poolMatch._id
    });

    return {
      slug,
      canGenerate: false,
      status: 409,
      message: 'A similar Demomoji is already in the voting pool.',
      existingSubmission: semanticMatch.poolMatch
    };
  }

  return {
    slug,
    canGenerate: true,
    existingStandard,
    existingSubmission: null
  };
}

demojisRouter.get('/', async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const { search = '', sort = 'popular', limit = 24 } = req.query;
    const parsedLimit = Math.min(Number(limit) || 24, 60);
    const normalizedSearch = normalizeConcept(search);
    const query = search
      ? {
          $or: [
            { prompt: { $regex: escapeRegex(normalizedSearch), $options: 'i' } },
            { description: { $regex: escapeRegex(normalizedSearch), $options: 'i' } }
          ]
        }
      : {};

    const sortOption = sort === 'new' ? { createdAt: -1 } : { votes: -1, createdAt: -1 };
    const demojis = await Demoji.find(query).sort(sortOption).limit(parsedLimit);

    logInfo('demojis.list.success', {
      search,
      sort,
      count: demojis.length,
      elapsedMs: Date.now() - startedAt
    });

    res.json({ demojis });
  } catch (error) {
    logError('demojis.list.failed', error, {
      elapsedMs: Date.now() - startedAt
    });
    next(error);
  }
});

demojisRouter.get('/check', async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const prompt = String(req.query.prompt || '');

    if (!prompt.trim()) {
      return res.status(400).json({ message: 'A prompt is required.' });
    }

    const availability = await getAvailability(prompt);

    logInfo('demojis.check.success', {
      prompt,
      slug: availability.slug,
      existingStandard: Boolean(availability.existingStandard?.exists),
      existingSubmission: Boolean(availability.existingSubmission),
      elapsedMs: Date.now() - startedAt
    });

    res.json({
      canGenerate: availability.canGenerate,
      existingStandard: availability.existingStandard,
      existingSubmission: availability.existingSubmission
    });
  } catch (error) {
    logError('demojis.check.failed', error, {
      elapsedMs: Date.now() - startedAt
    });
    next(error);
  }
});

demojisRouter.post('/preview', async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const { prompt, description, styleSet, refinement } = getSubmissionPayload(req.body);
    const validationMessage = validatePrompt(prompt);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const availability = await getAvailability(prompt);

    logInfo('demojis.preview.start', {
      prompt,
      slug: availability.slug,
      styleSet,
      refinement: Boolean(refinement)
    });

    if (!availability.canGenerate) {
      logInfo('demojis.preview.blocked', {
        prompt,
        slug: availability.slug,
        reason: availability.message,
        elapsedMs: Date.now() - startedAt
      });

      return res.status(availability.status).json(availability);
    }

    const generated = await generateDemojiImage({ prompt, styleSet, refinement });

    logInfo('demojis.preview.success', {
      prompt,
      slug: availability.slug,
      model: generated.model,
      elapsedMs: Date.now() - startedAt
    });

    res.status(201).json({
      draft: {
        prompt,
        description,
        styleSet,
        refinement,
        imageUrl: generated.imageUrl,
        generationModel: generated.model
      }
    });
  } catch (error) {
    logError('demojis.preview.failed', error, {
      elapsedMs: Date.now() - startedAt
    });
    next(error);
  }
});

demojisRouter.post('/', async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const { prompt, description, styleSet, refinement, imageUrl, generationModel } = getSubmissionPayload(req.body);
    const validationMessage = validatePrompt(prompt);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const availability = await getAvailability(prompt);
    const { slug } = availability;

    logInfo('demojis.create.start', {
      prompt,
      slug,
      styleSet,
      hasDraftImage: Boolean(imageUrl)
    });

    if (!availability.canGenerate && availability.existingStandard) {
      logInfo('demojis.create.blocked_standard', {
        prompt,
        slug,
        concept: availability.existingStandard.concept,
        elapsedMs: Date.now() - startedAt
      });

      return res.status(409).json({
        message: availability.message,
        existingStandard: availability.existingStandard
      });
    }

    if (!availability.canGenerate && availability.existingSubmission) {
      logInfo('demojis.create.blocked_duplicate', {
        prompt,
        slug,
        existingId: availability.existingSubmission._id,
        elapsedMs: Date.now() - startedAt
      });

      return res.status(409).json({
        message: availability.message,
        existingSubmission: availability.existingSubmission
      });
    }

    const generated = imageUrl
      ? { imageUrl, model: generationModel || 'draft-preview' }
      : await generateDemojiImage({ prompt, styleSet, refinement });

    logInfo('demojis.create.save_start', {
      prompt,
      slug,
      model: generated.model,
      elapsedMs: Date.now() - startedAt
    });

    const demoji = await Demoji.create({
      prompt,
      slug,
      description,
      styleSet,
      imageUrl: generated.imageUrl,
      generationModel: generated.model
    });

    logInfo('demojis.create.success', {
      prompt,
      slug,
      id: demoji._id,
      model: generated.model,
      elapsedMs: Date.now() - startedAt
    });

    res.status(201).json({ demoji });
  } catch (error) {
    logError('demojis.create.failed', error, {
      elapsedMs: Date.now() - startedAt
    });
    next(error);
  }
});

demojisRouter.patch('/:id/vote', async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const fingerprint = getFingerprint(req);
    const demoji = await Demoji.findById(req.params.id).select('+voteFingerprints');

    if (!demoji) {
      logInfo('demojis.vote.not_found', {
        id: req.params.id,
        elapsedMs: Date.now() - startedAt
      });

      return res.status(404).json({ message: 'Demomoji not found.' });
    }

    if (demoji.voteFingerprints.includes(fingerprint)) {
      logInfo('demojis.vote.duplicate', {
        id: req.params.id,
        elapsedMs: Date.now() - startedAt
      });

      return res.status(409).json({ message: 'You already voted for this demoji.' });
    }

    demoji.voteFingerprints.push(fingerprint);
    demoji.votes += 1;
    await demoji.save();

    logInfo('demojis.vote.success', {
      id: demoji._id,
      votes: demoji.votes,
      elapsedMs: Date.now() - startedAt
    });

    res.json({ demoji });
  } catch (error) {
    logError('demojis.vote.failed', error, {
      id: req.params.id,
      elapsedMs: Date.now() - startedAt
    });
    next(error);
  }
});
