import IpLookupIcon from '../../assets/icons/ip-lookup-icon.svg?react';
import { Container, Reveal, RoundedSection } from '../../ui';
import { CTASection } from '../landing/CTASection';
import { About } from './About';
import { HeroSection } from './HeroSection';

export default function MyIpPage() {
  return (
    <div className='bg-[#f7f8fc] text-[#192036]'>
      <Container>
        <HeroSection />
      </Container>

      <RoundedSection rounded className='relative z-10 bg-white text-[#1a1a1a]'>
        <Container>
          <Reveal>
            <About />
          </Reveal>
        </Container>

        <Container>
          <Reveal>
            <div className='flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-center'>
              <div className='flex flex-1 flex-col items-start justify-center gap-4'>
                <h3 className='font-primary font-bold text-start text-xl md:text-2xl text-foreground'>
                  How to find public IP address
                </h3>
                <p className='text-base text-start text-muted'>
                  To view your public IP address, simply look at the top of this page. You'll see
                  information about your IP, including your connection location, internet service
                  provider, and whether your connection is secure.
                </p>
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
            <CTASection />
          </Reveal>
        </Container>
      </RoundedSection>
    </div>
  );
}
