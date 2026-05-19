import { fal } from '@fal-ai/client';
import { env } from '../config/env.js';
import { logError, logInfo } from './logger.js';

if (env.falKey) {
  fal.config({
    credentials: env.falKey
  });
}

function getImageUrl(result) {
  const data = result?.data || result;
  return (
    data?.images?.[0]?.url ||
    data?.image?.url ||
    data?.url ||
    data?.output?.images?.[0]?.url ||
    ''
  );
}

function createLocalPreview(prompt) {
  const safePrompt = prompt.replace(/[<>&"']/g, '');
  const initials = safePrompt
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <radialGradient id="g" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="48%" stop-color="#ffe680"/>
          <stop offset="100%" stop-color="#ffb02e"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" rx="220" fill="#f7f7fb"/>
      <circle cx="512" cy="500" r="330" fill="url(#g)" stroke="#f2a51f" stroke-width="22"/>
      <text x="512" y="554" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="220" font-weight="800" fill="#2b2114">${initials || '?'}</text>
      <text x="512" y="820" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#47351d">${safePrompt}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function withTimeout(promise, timeoutMs, label) {
  let timeout;

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export async function generateDemojiImage({ prompt, styleSet = 'standard', refinement = '' }) {
  const startedAt = Date.now();
  const generationPrompt = [
    `Create a brand-new emoji for: ${prompt}.`,
    'Use a modern production emoji style: rounded, polished, high contrast, simple shapes, clean lighting, and a centered subject.',
    'Design it like a real Unicode emoji asset that must remain readable at 16px favicon size.',
    'Use one clear object or character pose, minimal micro-detail, bold silhouette, and simplified materials.',
    'Do not add an enclosing circle, circular badge, ring, border, sticker outline, scenic background, text, watermark, or extra decorative elements.',
    refinement ? `Apply this revision direction: ${refinement}.` : '',
    'Square composition, transparent or plain clean background, no icon sheet.'
  ]
    .filter(Boolean)
    .join(' ');

  if (!env.falKey) {
    logInfo('fal.preview.local', {
      prompt,
      styleSet,
      refinement: Boolean(refinement),
      reason: 'FAL_KEY missing'
    });

    return {
      imageUrl: createLocalPreview(prompt),
      model: 'local-preview'
    };
  }

  logInfo('fal.generate.start', {
    prompt,
    styleSet,
    refinement: Boolean(refinement),
    model: env.falModelId,
    timeoutMs: env.falTimeoutMs
  });

  let result;

  try {
    result = await withTimeout(
      fal.subscribe(env.falModelId, {
        input: {
          prompt: generationPrompt,
          image_size: 'square_hd',
          num_images: 1
        },
        logs: true,
        onQueueUpdate(update) {
          logInfo('fal.generate.queue', {
            prompt,
            status: update?.status
          });
        }
      }),
      env.falTimeoutMs,
      'Fal generation'
    );
  } catch (error) {
    logError('fal.generate.failed', error, {
      prompt,
      styleSet,
      refinement: Boolean(refinement),
      model: env.falModelId,
      elapsedMs: Date.now() - startedAt
    });
    throw error;
  }

  const imageUrl = getImageUrl(result);

  if (!imageUrl) {
    logError('fal.generate.no_image_url', new Error('Fal did not return an image URL'), {
      prompt,
      model: env.falModelId,
      elapsedMs: Date.now() - startedAt,
      resultKeys: Object.keys(result?.data || result || {}).join(',')
    });
    throw new Error('Fal did not return an image URL');
  }

  logInfo('fal.generate.success', {
    prompt,
    styleSet,
    refinement: Boolean(refinement),
    model: env.falModelId,
    elapsedMs: Date.now() - startedAt,
    hasImageUrl: Boolean(imageUrl)
  });

  return {
    imageUrl,
    model: env.falModelId
  };
}
