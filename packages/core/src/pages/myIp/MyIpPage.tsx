import { useTranslation } from 'react-i18next';
import IpLookupIcon from '../../assets/icons/ip-lookup-icon.svg?react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { Heading } from '../../ui/Heading';
import { TrialPeriodBanner } from '../landing/TrialPeriodBanner';
import { About } from './About';
import { HeroSection } from './HeroSection';
import { WhatIsIp } from './WhatIsIp';

export default function MyIpPage() {
  const { t } = useTranslation();

  return (
    <div className='bg-background'>
      <Container>
        <HeroSection />
      </Container>

      <RoundedSection rounded className='relative z-10 bg-white'>
        <Container>
          <Reveal>
            <About />
          </Reveal>
        </Container>

        <Container>
          <Reveal>
            <WhatIsIp />
          </Reveal>
        </Container>

        <Container>
          <Reveal>
            <div className='flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-center'>
              <div className='flex flex-1 flex-col items-start justify-center gap-4'>
                <Heading as='h3'>{t('myIp.findPublicIp.title')}</Heading>
                <p className='text-base text-start text-muted'>{t('myIp.findPublicIp.body')}</p>
              </div>
              <IpLookupIcon
                aria-hidden='true'
                focusable='false'
                className='mx-auto h-48 w-full max-w-72 shrink-0 sm:h-64 lg:mx-0 lg:w-80'
              />
            </div>
          </Reveal>
        </Container>

        <Container>
          <Reveal>
            <TrialPeriodBanner />
          </Reveal>
        </Container>
      </RoundedSection>
    </div>
  );
}
