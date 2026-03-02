import path from 'path';

export function resolveMediaPathCandidates(rawPathValue: string | null | undefined): string[] {
  const rawPath = String(rawPathValue || '').trim();
  if (!rawPath) return [];

  const candidates: string[] = [];
  if (rawPath.startsWith('/data/')) {
    candidates.push(path.join(process.cwd(), rawPath.substring(1)));
    candidates.push(path.join('/data', rawPath.substring('/data/'.length)));
  } else if (rawPath.startsWith('data/')) {
    candidates.push(path.join(process.cwd(), rawPath));
    candidates.push(path.join('/data', rawPath.substring('data/'.length)));
  } else if (path.isAbsolute(rawPath)) {
    candidates.push(rawPath);
    candidates.push(path.join(process.cwd(), rawPath.substring(1)));
  } else {
    candidates.push(path.join(process.cwd(), rawPath));
    candidates.push(path.join(process.cwd(), 'data', rawPath));
    candidates.push(path.join('/data', rawPath));
  }

  return Array.from(new Set(candidates));
}
