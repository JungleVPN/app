import { IconDevices, IconReceiptRefund, IconShieldCheck, IconUsersGroup } from '@tabler/icons-react';
import { Accordion } from '@heroui/react';
import type { ReactNode } from 'react';

const faqItems: { question: string; answer: string; icon: ReactNode }[] = [
  {
    icon: <IconShieldCheck size={20} />,
    question: 'What makes BlancVPN one of the best VPNs on the market?',
    answer:
      'BlancVPN combines military-grade encryption, a strict no-logs policy, and lightning-fast servers in 60+ countries. Our proprietary protocol delivers speeds that let you stream, game, and browse without interruption — all while keeping your data private.',
  },
  {
    icon: <IconDevices size={20} />,
    question: 'What devices are supported by BlancVPN?',
    answer:
      'BlancVPN works on all major platforms: iOS, Android, macOS, Windows, and Linux. Browser extensions are available for Chrome and Firefox. One subscription covers all your devices simultaneously.',
  },
  {
    icon: <IconUsersGroup size={20} />,
    question: 'Can I use one BlancVPN subscription on multiple devices?',
    answer:
      'Yes. A single BlancVPN subscription lets you connect unlimited devices at the same time. Protect your phone, laptop, tablet, and router all under one plan.',
  },
  {
    icon: <IconReceiptRefund size={20} />,
    question: 'How does the BlancVPN 30-day money-back guarantee work?',
    answer:
      "If you're not completely satisfied within the first 30 days, contact our support team and we'll issue a full refund — no questions asked. The guarantee applies to all new subscriptions.",
  },
];

export function FAQSection() {
  return (
    <section className='mx-auto w-full px-6 py-24 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          Frequently asked questions
        </h2>
      </div>

      <Accordion className='mx-auto w-full max-w-3xl' variant='surface'>
        {faqItems.map((item, index) => (
          <Accordion.Item key={index}>
            <Accordion.Heading>
              <Accordion.Trigger>
                <span className='mr-3 shrink-0 text-muted'>{item.icon}</span>
                {item.question}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>{item.answer}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
