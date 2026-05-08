import { Tabs } from '@heroui/react';
import type { TSubscriptionPageAppConfig } from '@workspace/types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getIconFromLibrary, vibrate } from '../../../../utils';
import classes from '../../InstallationGuide.module.css';

interface AppTabsProps {
  platformApps: TSubscriptionPageAppConfig[];
  platformId: string;
  selectedAppIndex: number;
  svgLibrary: Record<string, string>;
  onAppChange: (index: number) => void;
}

export function AppTabs({
  platformApps,
  platformId,
  selectedAppIndex,
  svgLibrary,
  onAppChange,
}: AppTabsProps) {
  const { t } = useTranslation();

  if (platformApps.length === 0) return null;

  const appIds = platformApps.map((app) => `${platformId}:${app.name}`);
  const safeIndex =
    selectedAppIndex >= 0 && selectedAppIndex < platformApps.length ? selectedAppIndex : 0;

  return (
    <Tabs
      orientation={`${platformApps.length >= 3 ? 'vertical' : 'horizontal'}`}
      key={platformId}
      className={'w-full'}
      selectedKey={appIds[safeIndex]}
      variant='primary'
      onSelectionChange={(key) => {
        if (key == null) return;
        const nextIndex = appIds.indexOf(String(key));
        if (nextIndex < 0) return;
        vibrate('toggle');
        onAppChange(nextIndex);
      }}
    >
      <Tabs.ListContainer className={'w-full'}>
        <Tabs.List
          aria-label={t('a11y.appsTabs')}
          className={'w-full bg-[var(--quaternary-fill-background)]'}
        >
          {platformApps.map((app, index) => {
            const isActive = index === safeIndex;
            return (
              <Tabs.Tab
                key={appIds[index]}
                id={appIds[index]}
                className={clsx(
                  isActive && classes.appButtonActive,
                  app.featured && classes.appButtonFeatured,
                )}
              >
                {app.featured ? <span className={classes.featuredBadge} /> : null}
                {app.svgIconKey ? (
                  <span
                    className={clsx(classes.bgIcon, isActive && classes.bgIconActive)}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG icon string
                    dangerouslySetInnerHTML={{
                      __html: getIconFromLibrary(app.svgIconKey, svgLibrary),
                    }}
                  />
                ) : null}
                <span className={classes.appName}>{app.name}</span>
                <Tabs.Indicator />
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
