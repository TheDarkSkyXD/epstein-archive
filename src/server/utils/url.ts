const CORPUS_BASE_PATH = process.env.RAW_CORPUS_BASE_PATH || '';

export function toServedDocumentUrl(input?: string | null): string | null {
  if (!input) return null;
  const url = String(input).replace(/\\/g, '/');

  if (CORPUS_BASE_PATH && url.startsWith(CORPUS_BASE_PATH)) {
    return url.replace(CORPUS_BASE_PATH, '/files').replace(/\/{2,}/g, '/');
  }

  if (url.includes('/data/')) {
    return url.replace(/^.*\/data\//, '/data/').replace(/\/{2,}/g, '/');
  }

  if (url.startsWith('data/')) {
    // In production, data/ prefixes must map to /files/ for authenticated serving
    return `/files/${url.substring(5)}`.replace(/\/{2,}/g, '/');
  }

  if (url.startsWith('/')) {
    return url.replace(/\/{2,}/g, '/');
  }

  return `/files/${url}`.replace(/\/{2,}/g, '/');
}
