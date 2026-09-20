import Marquee from 'react-fast-marquee';
import { useTranslation } from 'react-i18next';

const SERVERS = [
  { flag: '🇦🇹', code: 'at', stableId: 'c96085c98b645c14' },
  { flag: '🇺🇸', code: 'us', stableId: '7523869015daa789' },
  { flag: '🇩🇪', code: 'de', stableId: '8c2b912906620243' },
  { flag: '🇳🇱', code: 'nl', stableId: 'f999ce2e170d4911' },
  { flag: '🇫🇮', code: 'fi', stableId: '1e54362d1b38c1cd' },
  { flag: '🇷🇺', code: 'ru', stableId: '47df2d51d885276a' },
];

/** The marquee shows the list three times; ids keep React keys unique across passes. */
const MARQUEE_SERVERS = ['a', 'b', 'c'].flatMap((pass) =>
  SERVERS.map((server) => ({ ...server, id: `${server.code}-${pass}` })),
);

export const Stats = () => {
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
              src={`https://health.thejungle.pro/?stableId=${stableId}&theme=light&transparent=true&rounded=full&showName=false`}
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
