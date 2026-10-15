/**
 * loadScript — adds a third-party script to the page once, shared by every
 * caller. A script something else already loaded, such as a wallet SDK that
 * Whop's own code pulled in, is not loaded a second time.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { loadScript } from './loadScript';

afterEach(() => {
  document.head.replaceChildren();
});

let nextScript = 0;
const uniqueSrc = () => `https://cdn.example.com/sdk-${++nextScript}.js`;

const scriptsFor = (src: string) => document.head.querySelectorAll(`script[src="${src}"]`);

const scriptFor = (src: string): HTMLScriptElement => {
  const script = document.head.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (!script) throw new Error(`no script for ${src}`);
  return script;
};

describe('loadScript', () => {
  it('adds the script once however many callers ask for it', () => {
    const src = uniqueSrc();

    void loadScript(src);
    void loadScript(src);

    expect(scriptsFor(src)).toHaveLength(1);
  });

  it('resolves every caller once the script has loaded', async () => {
    const src = uniqueSrc();
    const first = loadScript(src);
    const second = loadScript(src);

    scriptFor(src).dispatchEvent(new Event('load'));

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('removes a script that failed, so a later call can try again', async () => {
    const src = uniqueSrc();
    const failed = loadScript(src);

    scriptFor(src).dispatchEvent(new Event('error'));

    await expect(failed).rejects.toThrow(src);
    expect(scriptsFor(src)).toHaveLength(0);
    void loadScript(src);
    expect(scriptsFor(src)).toHaveLength(1);
  });

  it('adds nothing when the script is already loaded', async () => {
    const src = uniqueSrc();

    await loadScript(src, { isLoaded: () => true });

    expect(scriptsFor(src)).toHaveLength(0);
  });

  it('adds the script when it is not loaded yet', () => {
    const src = uniqueSrc();

    void loadScript(src, { isLoaded: () => false });

    expect(scriptsFor(src)).toHaveLength(1);
  });
});
