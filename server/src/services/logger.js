function formatMeta(meta = {}) {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined && value !== '');

  if (!entries.length) {
    return '';
  }

  return ` ${JSON.stringify(Object.fromEntries(entries))}`;
}

export function logInfo(message, meta) {
  console.info(`[demojis] ${new Date().toISOString()} ${message}${formatMeta(meta)}`);
}

export function logError(message, error, meta) {
  console.error(
    `[demojis] ${new Date().toISOString()} ${message}${formatMeta({
      ...meta,
      error: error?.message || error
    })}`
  );
}
