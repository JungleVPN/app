import Marquee from 'react-fast-marquee';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks';

const SERVERS = [
  { flag: '🇦🇹', code: 'at', stableId: 'c2895df5f9d24049' },
  { flag: '🇺🇸', code: 'us', stableId: '0172cd32ccd7cfcd' },
  { flag: '🇩🇪', code: 'de', stableId: '42cd27737e86d4af' },
  { flag: '🇳🇱', code: 'nl', stableId: 'bcc819be08a37eb6' },
  { flag: '🇫🇮', code: 'fi', stableId: '4cd8b86c7c3a66f5' },
  { flag: '🇷🇺', code: 'ru', stableId: '55d99e8dc5987ec2' },
];

/** The marquee shows the list three times; ids keep React keys unique across passes. */
const MARQUEE_SERVERS = ['a', 'b', 'c'].flatMap((pass) =>
  SERVERS.map((server) => ({ ...server, id: `${server.code}-${pass}` })),
);

export const Stats = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <div dir='ltr'>
      <Marquee className='py-6' speed={40} gradient={false}>
        {MARQUEE_SERVERS.map(({ flag, code, stableId, id }) => (
          <div
            key={id}
            className='mx-3 flex items-start j gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2'
          >
            <div className='flex items-center gap-1'>
              <span className='text-xl'>{flag}</span>
              <span className='text-sm font-medium text-foreground'>
                {t(`landing.countries.names.${code}`)}
              </span>
            </div>
            <iframe
              src={`https://health.thejungle.pro/?stableId=${stableId}&theme=${theme}&transparent=true&rounded=full&showName=false`}
              width={100}
              height={40}
              title={t(`landing.countries.names.${code}`)}
              className='shrink-0'
            />
          </div>
        ))}
      </Marquee>
    </div>
  );
};
