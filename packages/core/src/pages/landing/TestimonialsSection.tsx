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
      'Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.',
    name: 'Bilal Ahmed',
    role: 'IT Manager',
    avatar: 'https://i.pravatar.cc/48?img=12',
  },
  {
    quote:
      'This ERP unified our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.',
    name: 'Briana Patton',
    role: 'Operations Manager',
    avatar: 'https://i.pravatar.cc/48?img=47',
  },
  {
    quote:
      "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.",
    name: 'Omar Raza',
    role: 'CEO',
    avatar: 'https://i.pravatar.cc/48?img=33',
  },
  {
    quote:
      'Our business functions improved with a user-friendly design and positive customer feedback.',
    name: 'Farhan Siddiqui',
    role: 'Marketing Director',
    avatar: 'https://i.pravatar.cc/48?img=52',
  },
  {
    quote:
      'They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.',
    name: 'Aliza Khan',
    role: 'Business Analyst',
    avatar: 'https://i.pravatar.cc/48?img=25',
  },
  {
    quote:
      'Its robust features and quick deployment helped us scale without disrupting our existing workflows.',
    name: 'David Chen',
    role: 'Product Manager',
    avatar: 'https://i.pravatar.cc/48?img=8',
  },
  {
    quote:
      'The reporting tools alone saved us hours every week. Our team adopted it with almost no friction.',
    name: 'Sara Mitchell',
    role: 'Finance Lead',
    avatar: 'https://i.pravatar.cc/48?img=45',
  },
  {
    quote:
      'Excellent support team and a product that genuinely listens to user feedback. Updates keep getting better.',
    name: 'Priya Nair',
    role: 'CTO',
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
    <section className='w-full overflow-hidden py-24'>
      <style>{keyframesStyle}</style>

      <div className='mb-16 flex flex-col items-center gap-4 px-6 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>Testimonials</Chip.Label>
        </Chip>
        <h2 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl'>
          What our users say
        </h2>
        <p className='max-w-md text-sm text-muted'>
          Discover how thousands of teams streamline their operations with our platform.
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
