import { describe, expect, it } from 'vitest';
import { negotiateRepresentation } from './accept-negotiation';

describe('negotiateRepresentation', () => {
  it('serves html when the Accept header is missing, matching plain browser requests', () => {
    expect(negotiateRepresentation(undefined)).toBe('html');
  });

  it('resolves a bare wildcard to html, since the client named no preference', () => {
    expect(negotiateRepresentation('*/*')).toBe('html');
  });

  it('serves html for a standard browser Accept header', () => {
    expect(
      negotiateRepresentation('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
    ).toBe('html');
  });

  it('resolves an equal-preference tie to markdown only when the client explicitly names text/markdown', () => {
    expect(negotiateRepresentation('text/markdown, text/html')).toBe('markdown');
  });

  it('respects an explicit q-value preference for html over markdown', () => {
    expect(negotiateRepresentation('text/html, text/markdown;q=0.5')).toBe('html');
  });

  it('respects an explicit q-value preference for markdown over html', () => {
    expect(negotiateRepresentation('text/html;q=0.5, text/markdown')).toBe('markdown');
  });

  it('serves markdown when only markdown is acceptable', () => {
    expect(negotiateRepresentation('text/markdown')).toBe('markdown');
  });

  it('returns none when neither html nor markdown is acceptable, so the caller can 406', () => {
    expect(negotiateRepresentation('application/json')).toBe('none');
  });

  it('returns none when html is explicitly rejected and markdown is not requested', () => {
    expect(negotiateRepresentation('text/html;q=0')).toBe('none');
  });
});
