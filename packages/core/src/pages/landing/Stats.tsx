import { Button, Card, Label, Meter } from '@heroui/react';
import { IconBrandSpeedtest, IconServer } from '@tabler/icons-react';
import type { NodeStatDto } from '@workspace/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../api';
import { useNodeStats } from '../../hooks';
import { Heading, Paragraph } from '../../ui';
import { cn, countryName, flagEmoji } from '../../utils';

/** Two rows of three on desktop; the rest wait behind "See all locations". */
const COLLAPSED_COUNT = 6;

/** One row's worth of the hidden cards, cut off and faded, hinting there is more. */
const PEEK_CLASSES = ['', 'hidden sm:block', 'hidden lg:block'];

type Location = {
  countryCode: string;
  serverCount: number;
  isConnected: boolean;
  /** Averages in percent over the servers that reported; `null` if none did. */
  memoryPercent: number | null;
  cpuPercent: number | null;
};

const average = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

function toLocation(countryCode: string, servers: NodeStatDto[]): Location {
  const memory = servers.flatMap(({ memoryUsed, memoryTotal }) =>
    memoryUsed !== null && memoryTotal ? [(memoryUsed / memoryTotal) * 100] : [],
  );
  // Above 1 the server has a queue; for the meter it is simply full.
  const cpu = servers.flatMap(({ cpuLoad }) =>
    cpuLoad === null ? [] : [Math.min(cpuLoad, 1) * 100],
  );

  return {
    countryCode,
    serverCount: servers.length,
    isConnected: servers.some((server) => server.isConnected),
    memoryPercent: average(memory),
    cpuPercent: average(cpu),
  };
}

/** One location per country, in the order the panel first lists each. */
function groupByCountry(nodes: NodeStatDto[]): Location[] {
  const countries = [...new Set(nodes.map((node) => node.countryCode))];
  return countries.map((code) =>
    toLocation(
      code,
      nodes.filter((node) => node.countryCode === code),
    ),
  );
}

function meterColor(percent: number): 'success' | 'warning' | 'danger' {
  if (percent < 60) return 'success';
  if (percent < 85) return 'warning';
  return 'danger';
}

function StatusIndicator({ isConnected }: { isConnected: boolean }) {
  const { t } = useTranslation();

  return (
    <span className='flex items-center gap-2 text-sm text-muted'>
      <span className='relative flex size-2.5' aria-hidden='true'>
        {isConnected && (
          <span className='absolute inline-flex size-full rounded-full bg-success opacity-75 motion-safe:animate-ping' />
        )}
        <span
          className={`relative inline-flex size-2.5 rounded-full ${isConnected ? 'bg-success' : 'bg-default-400'}`}
        />
      </span>
      {t(isConnected ? 'landing.stats.online' : 'landing.stats.offline')}
    </span>
  );
}

function UsageMeter({ label, percent }: { label: string; percent: number }) {
  return (
    <Meter value={percent} size='sm' color={meterColor(percent)}>
      <Label className='text-sm text-muted'>{label}</Label>
      <Meter.Output className='text-sm' />
      <Meter.Track>
        <Meter.Fill />
      </Meter.Track>
    </Meter>
  );
}

function LocationCard({ location }: { location: Location }) {
  const { t, i18n } = useTranslation();
  const { countryCode, serverCount, isConnected, memoryPercent, cpuPercent } = location;

  return (
    <Card className='flex h-full flex-col gap-4 rounded-3xl bg-white p-6 shadow-md transition-shadow duration-300 hover:shadow-lg'>
      <div className='flex items-start justify-between gap-4'>
        <span
          className='flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-[5.5rem] leading-none ring-1 ring-black/5'
          aria-hidden='true'
        >
          {flagEmoji(countryCode)}
        </span>
        <StatusIndicator isConnected={isConnected} />
      </div>

      <Heading as='h3'>{countryName(countryCode, i18n.language)}</Heading>

      <div className='flex flex-col gap-2 text-muted'>
        <div className='flex items-center gap-2'>
          <IconServer size={20} aria-hidden='true' />
          <span>{t('landing.stats.servers', { count: serverCount })}</span>
        </div>
        <div className='flex items-center gap-2'>
          <IconBrandSpeedtest size={20} aria-hidden='true' />
          <span>{t('landing.stats.speed')}</span>
        </div>
      </div>

      {memoryPercent === null && cpuPercent === null ? (
        <Paragraph className='mt-auto text-sm text-muted'>{t('landing.stats.noData')}</Paragraph>
      ) : (
        <div className='mt-auto flex flex-col gap-3'>
          {memoryPercent !== null && (
            <UsageMeter label={t('landing.stats.memory')} percent={memoryPercent} />
          )}
          {cpuPercent !== null && (
            <UsageMeter label={t('landing.stats.cpu')} percent={cpuPercent} />
          )}
        </div>
      )}
    </Card>
  );
}

const GRID_CLASSES = 'grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

/**
 * Live server locations, straight from the panel via /nodes/stats and grouped
 * into one card per country. Renders nothing if the stats cannot be fetched:
 * a marketing page is better without the section than with an error in it.
 */
export function Stats() {
  const { t } = useTranslation();
  const state = useNodeStats(useRemnawaveApi());
  const [expanded, setExpanded] = useState(false);

  if (state.status === 'error') return null;

  const locations = state.status === 'ready' ? groupByCountry(state.nodes) : [];
  const isCollapsible = locations.length > COLLAPSED_COUNT;
  const isCollapsed = isCollapsible && !expanded;
  const visible = isCollapsed ? locations.slice(0, COLLAPSED_COUNT) : locations;
  const peek = isCollapsed
    ? locations.slice(COLLAPSED_COUNT, COLLAPSED_COUNT + PEEK_CLASSES.length)
    : [];

  return (
    <section className='flex flex-col items-center gap-12'>
      <div className='flex max-w-2xl flex-col items-center gap-4 text-center'>
        <Heading as='h2'>{t('landing.stats.title')}</Heading>
        <Paragraph>{t('landing.stats.subtitle')}</Paragraph>
      </div>

      {state.status === 'loading' ? (
        <ul
          aria-busy='true'
          aria-label={t('landing.stats.title')}
          className={cn(GRID_CLASSES, 'overflow-hidden max-h-192')}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders with no identity
              key={i}
              aria-hidden='true'
              className='h-72 animate-pulse rounded-3xl bg-default-100'
            />
          ))}
        </ul>
      ) : (
        <div className='flex w-full flex-col gap-6'>
          <ul className={GRID_CLASSES}>
            {visible.map((location) => (
              <li key={location.countryCode}>
                <LocationCard location={location} />
              </li>
            ))}
          </ul>
          {peek.length > 0 && (
            <div
              aria-hidden='true'
              inert
              className={cn(
                GRID_CLASSES,
                'pointer-events-none h-56 select-none overflow-hidden mask-b-from-0%',
              )}
            >
              {peek.map((location, index) => (
                <div key={location.countryCode} className={PEEK_CLASSES[index]}>
                  <LocationCard location={location} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isCollapsible && (
        <Button
          size='lg'
          variant={expanded ? 'secondary' : 'primary'}
          className='h-14 w-72 rounded-full'
          onPress={() => setExpanded((current) => !current)}
        >
          {t(expanded ? 'landing.stats.showLess' : 'landing.stats.seeAll')}
        </Button>
      )}
    </section>
  );
}
