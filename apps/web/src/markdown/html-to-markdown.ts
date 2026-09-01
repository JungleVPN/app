import TurndownService from 'turndown';

/** Tag names with no useful content for a text-only reader: scripts, styles, the site header and decorative icons. */
const IGNORED_TAGS = new Set(['script', 'style', 'svg', 'header']);

function isIgnored(node: HTMLElement): boolean {
  return (
    IGNORED_TAGS.has(node.nodeName.toLowerCase()) ||
    node.getAttribute('aria-hidden') === 'true' ||
    node.hasAttribute('data-md-ignore')
  );
}

function createService(): TurndownService {
  const service = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  service.remove(isIgnored);
  return service;
}

/**
 * Converts server-rendered page HTML to Markdown for the .md alternates. Strips
 * scripts, styles, decorative icons, the site header, and any chrome explicitly
 * marked data-md-ignore as a manual escape hatch for non-semantic wrappers.
 */
export function htmlToMarkdown(html: string): string {
  return createService().turndown(html).trim();
}
