import type { FC } from 'react';
import * as MarqueeModule from 'react-fast-marquee';
import { useTranslation } from 'react-i18next';

/**
 * react-fast-marquee is CJS (`exports.default = Component`, `__esModule: true`, no
 * `exports` map). Vite's dev-mode SSR sometimes evaluates it via Node's native
 * CJS/ESM interop, which resolves `.default` to the whole `module.exports` object
 * rather than the component — renderToString then throws "Element type is invalid
 * ... got: object". The client (esbuild) bundle always unwraps it correctly, so
 * `.default` there is already the real component and this optional-chain is a
 * no-op. Normalizing both shapes here keeps SSR and the client bundle in sync
 * without depending on bundler-specific interop behavior.
 */
const Marquee: FC<MarqueeModule.MarqueeProps> =
  (MarqueeModule.default as unknown as { default?: FC<MarqueeModule.MarqueeProps> })?.default ??
  MarqueeModule.default;

const COUNTRIES = [
  { flag: '🇺🇸', code: 'us' },
  { flag: '🇩🇪', code: 'de' },
  { flag: '🇳🇱', code: 'nl' },
  { flag: '🇦🇹', code: 'at' },
  { flag: '🇫🇮', code: 'fi' },
  { flag: '🇷🇺', code: 'ru' },
];

/** The marquee shows the list four times; ids keep React keys unique across passes. */
const MARQUEE_COUNTRIES = ['a', 'b', 'c', 'd'].flatMap((pass) =>
  COUNTRIES.map((country) => ({ ...country, id: `${country.code}-${pass}` })),
);

function CountryBadge({ flag, name }: { flag: string; name: string }) {
  return (
    <div className='mx-3 flex items-center gap-2 rounded-full border border-border bg-content1 px-4 py-2 text-sm font-medium text-foreground'>
      <span className='text-lg'>{flag}</span>
      <span>{name}</span>
    </div>
  );
}

export function CountriesMarquee() {
  const { t } = useTranslation();

  return (
    <section>
      <p className='mb-6 text-center text-sm font-medium uppercase tracking-widest text-muted'>
        {t('landing.countries.label')}
      </p>
      <div dir='ltr'>
        <Marquee pauseOnHover>
          {MARQUEE_COUNTRIES.map(({ flag, code, id }) => (
            <CountryBadge key={id} flag={flag} name={t(`landing.countries.names.${code}`)} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
