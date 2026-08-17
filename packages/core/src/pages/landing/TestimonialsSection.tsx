import { Button, Card, Chip } from '@heroui/react';
import { IconArrowLeft, IconArrowRight, IconStarFilled } from '@tabler/icons-react';
import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider/react';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { useTranslation } from 'react-i18next';
import { Container } from '../../ui';

const TESTIMONIAL_KEYS = [
  'setup',
  'remote',
  'routing',
  'calls',
  'multiDevice',
  'support',
  'dataCap',
  'privacy',
] as const;

const STAR_RATING = [1, 2, 3, 4, 5] as const;
const AUTOPLAY_DELAY_MS = 3000;

const autoplay: KeenSliderPlugin = (slider) => {
  let timeout: ReturnType<typeof setTimeout>;
  let mouseOver = false;

  function clearNextTimeout() {
    clearTimeout(timeout);
  }

  function nextTimeout() {
    clearNextTimeout();
    if (mouseOver) return;
    timeout = setTimeout(() => {
      slider.next();
    }, AUTOPLAY_DELAY_MS);
  }

  slider.on('created', () => {
    slider.container.addEventListener('mouseover', () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener('mouseout', () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });
  slider.on('dragStarted', clearNextTimeout);
  slider.on('animationEnded', nextTimeout);
  slider.on('updated', nextTimeout);
};

function TestimonialCard({ quote, name }: { quote: string; name: string }) {
  return (
    <Card
      variant='secondary'
      className='flex h-full flex-col justify-between gap-6 p-5 shadow-surface shadow-md'
    >
      <p className='text-sm leading-relaxed text-foreground'>{quote}</p>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm font-medium text-muted'>{name}</p>
        {/*<IconExternalLink size={16} className='shrink-0 text-muted' />*/}
      </div>
    </Card>
  );
}

export function TestimonialsSection() {
  const { t } = useTranslation();
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: false,
      slides: {
        origin: 'auto',
        perView: 2.5,
        spacing: 16,
      },
      breakpoints: {
        '(max-width: 440px)': {
          slides: { origin: 'auto', perView: 1.5, spacing: 16 },
        },
        '(min-width: 640px)': {
          slides: { origin: 'auto', perView: 2.5, spacing: 16 },
        },
        '(min-width: 1024px)': {
          slides: { origin: 'auto', perView: 3.5, spacing: 16 },
        },
      },
    },
    [autoplay],
  );

  const goTo = (direction: 'prev' | 'next') => {
    const instance = instanceRef.current as KeenSliderInstance | null;
    if (direction === 'prev') instance?.prev();
    else instance?.next();
  };

  return (
    <section>
      <Container className='mb-10 flex flex-wrap items-center justify-between gap-6'>
        <div className='flex flex-col gap-4'>
          <Chip color='default' variant='secondary' className='w-fit'>
            <Chip.Label>{t('landing.testimonials.chip')}</Chip.Label>
          </Chip>
          <h2 className='text-xl font-bold tracking-tight sm:text-3xl lg:text-4xl'>
            {t('landing.testimonials.title')}
          </h2>
          <div className='flex items-center gap-1'>
            {STAR_RATING.map((star) => (
              <IconStarFilled key={star} size={20} className='text-primary' />
            ))}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Button
            isIconOnly
            size='md'
            variant='secondary'
            className='rounded-full'
            aria-label={t('a11y.scrollLeft')}
            onPress={() => goTo('prev')}
          >
            <IconArrowLeft size={18} />
          </Button>
          <Button
            isIconOnly
            size='md'
            variant='secondary'
            className='rounded-full'
            aria-label={t('a11y.scrollRight')}
            onPress={() => goTo('next')}
          >
            <IconArrowRight size={18} />
          </Button>
        </div>
      </Container>

      <Container>
        <div ref={sliderRef} className='keen-slider'>
          {TESTIMONIAL_KEYS.map((key) => (
            <div className='keen-slider__slide' key={key}>
              <TestimonialCard
                quote={t(`landing.testimonials.${key}.quote`)}
                name={t(`landing.testimonials.${key}.name`)}
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
