import { useTranslation } from 'react-i18next';
import CollectInfoIcon from '../../assets/icons/collect-info-icon.svg?react';
import IpIcon from '../../assets/icons/ip-address-icon.svg?react';
import { Grid, GridItem } from '../../ui';
import { Heading } from '../../ui/Heading';

export const About = () => {
  const { t } = useTranslation();

  return (
    <section className={'pt-8 lg:pt-16'}>
      <Heading as='h2'>{t('myIp.connection.title')}</Heading>

      <Grid className='mt-12 gap-4'>
        <GridItem size={{ base: 12 }}>
          <Grid className='gap-4'>
            <GridItem size={{ base: 12, md: 6 }} className='md:order-1'>
              <div className='flex flex-col justify-center gap-3 rounded-4xl bg-[#f2ecfd] px-8 py-14 text-center h-full'>
                <Heading as='h3'>{t('myIp.reveal.title')}</Heading>
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
                <Heading as='h3'>{t('myIp.fingerprint.title')}</Heading>
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
