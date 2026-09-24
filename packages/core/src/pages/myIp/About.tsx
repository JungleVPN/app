import { useTranslation } from 'react-i18next';
import CollectInfoIcon from '../../assets/icons/collect-info-icon.svg?react';
import IpIcon from '../../assets/icons/ip-address-icon.svg?react';
import { Grid, GridItem } from '../../ui';

export const About = () => {
  const { t } = useTranslation();

  return (
    <section className={'pt-8 lg:pt-16'}>
      <h2 className='font-primary text-2xl md:text-4xl font-extrabold tracking-[-0.035em]'>
        {t('myIp.connection.title')}
      </h2>

      <Grid className='mt-12 gap-4'>
        <GridItem size={{ base: 12 }}>
          <Grid className='gap-4'>
            <GridItem size={{ base: 12, md: 6 }} className='md:order-1'>
              <div className='flex flex-col justify-center gap-3 rounded-4xl bg-[#f2ecfd] px-8 py-14 text-center h-full'>
                <h3 className='font-primary font-bold text-xl md:text-2xl text-foreground'>
                  {t('myIp.reveal.title')}
                </h3>
                <p className='text-sm text-muted'>{t('myIp.reveal.body')}</p>
              </div>
            </GridItem>

            <GridItem size={{ base: 12, md: 6 }} className='md:order-2'>
              <div className='flex items-center justify-center overflow-hidden rounded-4xl bg-background'>
                <IpIcon
                  aria-hidden='true'
                  focusable='false'
                  className='h-64 w-64 md:h-88 md:w-88'
                />
              </div>
            </GridItem>
          </Grid>
        </GridItem>

        <GridItem size={{ base: 12 }}>
          <Grid className='gap-6'>
            <GridItem size={{ base: 12, md: 6 }} className='md:order-2'>
              <div className='flex flex-col justify-center gap-3 rounded-4xl bg-[#f2ecfd] px-8 py-14 text-center h-full'>
                <h3 className='font-primary font-bold text-xl md:text-2xl text-foreground'>
                  {t('myIp.fingerprint.title')}
                </h3>
                <p className='text-sm text-muted'>{t('myIp.fingerprint.body')}</p>
              </div>
            </GridItem>

            <GridItem size={{ base: 12, md: 6 }} className='md:order-1'>
              <div className='flex items-center justify-center overflow-hidden rounded-4xl bg-background'>
                <CollectInfoIcon
                  aria-hidden='true'
                  focusable='false'
                  className='h-64 w-64 md:h-88 md:w-88'
                />
              </div>
            </GridItem>
          </Grid>
        </GridItem>
      </Grid>
    </section>
  );
};
