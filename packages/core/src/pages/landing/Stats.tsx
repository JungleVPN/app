import Marquee from 'react-fast-marquee';
import { useTheme } from '../../hooks';

const SERVERS = [
  { flag: '🇦🇹', name: 'Austria', stableId: 'c2895df5f9d24049' },
  { flag: '🇺🇸', name: 'United States', stableId: '0172cd32ccd7cfcd' },
  { flag: '🇩🇪', name: 'Germany', stableId: '42cd27737e86d4af' },
  { flag: '🇳🇱', name: 'Netherlands', stableId: 'bcc819be08a37eb6' },
  { flag: '🇫🇮', name: 'Finland', stableId: '4cd8b86c7c3a66f5' },
  { flag: '🇷🇺', name: 'Russia', stableId: '55d99e8dc5987ec2' },
];

export const Stats = () => {
  const { theme } = useTheme();

  return (
    <Marquee className='py-6' speed={40} gradient={false}>
      {[...SERVERS, ...SERVERS, ...SERVERS].map(({ flag, name, stableId }) => (
        <div
          key={name}
          className='mx-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2'
        >
          <div className='flex items-center gap-1'>
            <span className='text-xl'>{flag}</span>
            <span className='text-sm font-medium text-foreground'>{name}</span>
          </div>
          <iframe
            src={`https://health.thejungle.pro/?stableId=${stableId}&theme=${theme}&transparent=true&rounded=full&showName=false`}
            width={100}
            height={40}
            title={name}
            className='flex-shrink-0'
          />
        </div>
      ))}
    </Marquee>
  );
};
