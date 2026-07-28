type PartnershipCardProps = {
  title: string;
  description: string;
  learnMoreHref?: string;
};

function PartnershipCard({ title, description, learnMoreHref = '#' }: PartnershipCardProps) {
  return (
    <div className='flex flex-col justify-between rounded-2xl bg-[#f0f4ff] p-8 dark:bg-muted/30'>
      <div>
        <h3 className='mb-4 text-xl font-bold text-foreground'>{title}</h3>
        <p className='text-muted text-sm leading-relaxed'>{description}</p>
      </div>
      <a href={learnMoreHref} className='mt-10 text-sm font-medium text-primary hover:underline'>
        Learn more
      </a>
    </div>
  );
}

export function PartnershipSection() {
  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          JungleVPN partnership opportunities
        </h2>
        <p className='text-muted text-base lg:text-lg'>
          Let's work together to make the internet more secure, private, and accessible for
          everyone.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <PartnershipCard
          title='Affiliate program'
          description='Earn with JungleVPN — take advantage of one of the most rewarding referral programs on the market.'
        />
        <PartnershipCard
          title='Referral program'
          description='Boost your business security with our tailored VPN solutions. Enjoy exclusive discounts on subscription plans and advanced protection for your entire team.'
        />
      </div>
    </section>
  );
}
