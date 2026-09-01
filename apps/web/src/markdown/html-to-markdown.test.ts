import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from './html-to-markdown';

describe('htmlToMarkdown', () => {
  it('converts headings, paragraphs and links to Markdown', () => {
    const html = '<h1>JungleVPN</h1><p>Fast and secure. <a href="/subscribe">Get a plan</a>.</p>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).toContain('# JungleVPN');
    expect(markdown).toContain('Fast and secure. [Get a plan](/subscribe).');
  });

  it('drops script and style tags entirely, not just their text', () => {
    const html = '<p>Content</p><script>trackEvent()</script><style>.x{color:red}</style>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).not.toContain('trackEvent');
    expect(markdown).not.toContain('color:red');
    expect(markdown).toContain('Content');
  });

  it('drops decorative svg icons', () => {
    const html = '<p>Content</p><svg><path d="M0 0"/></svg>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).not.toContain('<path');
    expect(markdown).toContain('Content');
  });

  it('drops elements hidden from assistive tech via aria-hidden', () => {
    const html = '<p>Content</p><div aria-hidden="true">decorative filler</div>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).not.toContain('decorative filler');
    expect(markdown).toContain('Content');
  });

  it('drops the site header', () => {
    const html = '<header><nav>Home | Pricing</nav></header><p>Real content</p>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).not.toContain('Home | Pricing');
    expect(markdown).toContain('Real content');
  });

  it('drops chrome explicitly marked data-md-ignore, an escape hatch for non-semantic wrappers', () => {
    const html = '<div data-md-ignore="true">Sidebar filler</div><p>Real content</p>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).not.toContain('Sidebar filler');
    expect(markdown).toContain('Real content');
  });
});
