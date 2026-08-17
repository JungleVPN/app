import { Card, Chip } from '@heroui/react';
import Marquee from 'react-fast-marquee';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Setup took about five minutes. I installed HAPP, imported the subscription link and it was already connected — no server settings to figure out.',
    name: 'Bilal Ahmed',
    role: 'Frequent traveller',
    avatar: 'https://i.pravatar.cc/48?img=12',
  },
  {
    quote:
      'I work from cafés most days, so an encrypted connection on public Wi-Fi was the whole reason I subscribed. It just stays on and I stop thinking about it.',
    name: 'Briana Patton',
    role: 'Remote worker',
    avatar: 'https://i.pravatar.cc/48?img=47',
  },
  {
    quote:
      'Smart routing is the part I did not expect to care about. Only what needs the VPN goes through it, so my banking and local apps keep working normally.',
    name: 'Omar Raza',
    role: 'Everyday user',
    avatar: 'https://i.pravatar.cc/48?img=33',
  },
  {
    quote:
      'Video calls hold up on the evenings when everything else slows down. I have not had to switch locations to get a stable connection.',
    name: 'Farhan Siddiqui',
    role: 'Freelancer',
    avatar: 'https://i.pravatar.cc/48?img=52',
  },
  {
    quote:
      "One subscription across my phone, laptop and my partner's laptop. That was the deciding factor for us.",
    name: 'Aliza Khan',
    role: 'Subscriber since 2024',
    avatar: 'https://i.pravatar.cc/48?img=25',
  },
  {
    quote:
      'I had a question about my subscription and got an answer from an actual person in about ten minutes. No ticket loop, no bot.',
    name: 'David Chen',
    role: 'Subscriber',
    avatar: 'https://i.pravatar.cc/48?img=8',
  },
  {
    quote:
      'No monthly data cap means I do not ration streaming or downloads any more. I used to hit the limit on my old free VPN in a week.',
    name: 'Sara Mitchell',
    role: 'Student',
    avatar: 'https://i.pravatar.cc/48?img=45',
  },
  {
    quote:
      'What I wanted was a clear privacy policy and a connection that does not drop. That is what I got, and the trial let me check before paying.',
    name: 'Priya Nair',
    role: 'Privacy-conscious user',
    avatar: 'https://i.pravatar.cc/48?img=38',
  },
];
const COL_1 = [TESTIMONIALS[0], TESTIMONIALS[1], TESTIMONIALS[2], TESTIMONIALS[3]];
const COL_2 = [TESTIMONIALS[4], TESTIMONIALS[5], TESTIMONIALS[6], TESTIMONIALS[7]];
const COL_3 = [TESTIMONIALS[2], TESTIMONIALS[5], TESTIMONIALS[0], TESTIMONIALS[7]];

const ROW_1 = [TESTIMONIALS[0], TESTIMONIALS[1], TESTIMONIALS[2], TESTIMONIALS[3]];
const ROW_2 = [TESTIMONIALS[4], TESTIMONIALS[5], TESTIMONIALS[6], TESTIMONIALS[7]];

function TestimonialCard({ quote, name, role, avatar }: Testimonial) {
  return (
    <Card
      variant='secondary'
      className='flex flex-col justify-between gap-4 p-5 shadow-surface shadow-sm'
    >
      <p className='text-sm leading-relaxed text-foreground'>{quote}</p>
      <div className='flex items-center gap-3'>
        <img src={avatar} alt={name} className='h-10 w-10 rounded-full object-cover' />
        <div>
          <p className='text-sm font-semibold text-foreground'>{name}</p>
          <p className='text-xs text-muted'>{role}</p>
        </div>
      </div>
    </Card>
  );
}

function VerticalMarqueeColumn({
  items,
  direction,
  duration = 28,
}: {
  items: Testimonial[];
  direction: 'up' | 'down';
  duration?: number;
}) {
  const doubled = [...items, ...items];
  const animName = direction === 'up' ? 'marqueeScrollUp' : 'marqueeScrollDown';

  return (
    <div className='relative flex-1 overflow-hidden' style={{ height: 660 }}>
      <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-linear-to-b from-background to-transparent' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-linear-to-t from-background to-transparent' />
      <div
        className='flex flex-col gap-4'
        style={{ animation: `${animName} ${duration}s linear infinite` }}
      >
        {doubled.map((t) => (
          <TestimonialCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  );
}

const keyframesStyle = `
  @keyframes marqueeScrollUp {
    from { transform: translateY(0); }
    to   { transform: translateY(-50%); }
  }
  @keyframes marqueeScrollDown {
    from { transform: translateY(-50%); }
    to   { transform: translateY(0); }
  }
`;

export function TestimonialsSection() {
  return (
    <section>
      <style>{keyframesStyle}</style>

      <div className='mb-16 flex flex-col items-center gap-4 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>Testimonials</Chip.Label>
        </Chip>
        <h2 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl'>
          What our users say
        </h2>
        <p className='max-w-xl text-sm text-muted'>
          Real experiences from people who use JungleVPN for privacy, travel and everyday online
          security.
        </p>
      </div>

      {/* Desktop & tablet: vertical columns */}
      <div className='hidden gap-4 px-6 sm:flex '>
        <VerticalMarqueeColumn items={COL_1} direction='up' duration={26} />
        <VerticalMarqueeColumn items={COL_2} direction='down' duration={30} />
        <VerticalMarqueeColumn items={COL_3} direction='up' duration={22} />
      </div>

      {/* Mobile: horizontal rows */}
      <div className='flex flex-col gap-4 sm:hidden'>
        <Marquee
          gradient
          gradientWidth={30}
          gradientColor='var(--background)'
          pauseOnHover
          speed={30}
        >
          {ROW_1.map((t) => (
            <div key={t.name} className='mx-2 w-64'>
              <TestimonialCard {...t} />
            </div>
          ))}
        </Marquee>
        <Marquee
          gradient
          gradientWidth={30}
          gradientColor='var(--background)'
          pauseOnHover
          direction='right'
          speed={30}
        >
          {ROW_2.map((t) => (
            <div key={t.name} className='mx-2 w-64'>
              <TestimonialCard {...t} />
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
