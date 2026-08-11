import Marquee from 'react-fast-marquee';
import { useTranslation } from 'react-i18next';

const COUNTRIES = [
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇦🇹', name: 'Austria' },
  { flag: '🇫🇮', name: 'Finland' },
  { flag: '🇷🇺', name: 'Russia' },
];

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
    <section className='w-full'>
      <p className='mb-6 text-center text-sm font-medium uppercase tracking-widest text-muted'>
        {t('landing.countries.label')}
      </p>
      <Marquee pauseOnHover>
        {[...COUNTRIES, ...COUNTRIES, ...COUNTRIES, ...COUNTRIES].map(({ flag, name }) => (
          <CountryBadge key={flag} flag={flag} name={name} />
        ))}
      </Marquee>
    </section>
  );
}
