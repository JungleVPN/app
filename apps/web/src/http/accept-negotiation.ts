export type Representation = 'html' | 'markdown' | 'none';

interface MediaRange {
  type: string;
  q: number;
}

function parseAccept(header: string): readonly MediaRange[] {
  return header
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [type, ...params] = entry.split(';').map((part) => part.trim());
      const qParam = params.find((param) => param.startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { type: type ?? '*/*', q: Number.isNaN(q) ? 1 : q };
    });
}

function bestQ(ranges: readonly MediaRange[], type: string): number {
  const exact = ranges.find((range) => range.type === type);
  if (exact) return exact.q;
  const wildcard = ranges.find((range) => range.type === '*/*');
  return wildcard ? wildcard.q : 0;
}

/**
 * Picks html or markdown for a request's Accept header, comparing q-values rather
 * than substring-matching. Ties resolve to markdown only when the client explicitly
 * named text/markdown — otherwise (e.g. a bare wildcard from a browser) html wins.
 * Returns 'none' when neither representation is acceptable, so the caller can 406.
 */
export function negotiateRepresentation(acceptHeader: string | undefined): Representation {
  if (!acceptHeader || acceptHeader.trim() === '') return 'html';

  const ranges = parseAccept(acceptHeader);
  const htmlQ = bestQ(ranges, 'text/html');
  const markdownQ = bestQ(ranges, 'text/markdown');

  if (htmlQ === 0 && markdownQ === 0) return 'none';

  const explicitMarkdown = ranges.some((range) => range.type === 'text/markdown');
  if (explicitMarkdown && markdownQ >= htmlQ) return 'markdown';

  return htmlQ > 0 ? 'html' : 'markdown';
}
