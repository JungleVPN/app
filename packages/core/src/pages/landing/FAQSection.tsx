import { Accordion } from '@heroui/react';
import {
  IconDevices,
  IconReceiptRefund,
  IconShieldCheck,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const FAQ_ICONS: ReactNode[] = [
  <IconShieldCheck size={20} key={1} />,
  <IconDevices size={20} key={2} />,
  <IconUsersGroup size={20} key={3} />,
  <IconReceiptRefund size={20} key={4} />,
];

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const;

export function FAQSection() {
  const { t } = useTranslation();

  return (
    <section className='mx-auto w-full px-6 py-24 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.faq.title')}
        </h2>
      </div>

      <Accordion className='mx-auto w-full max-w-3xl' variant='surface'>
        {FAQ_KEYS.map((key, index) => (
          <Accordion.Item key={key}>
            <Accordion.Heading>
              <Accordion.Trigger>
                <span className='mr-3 shrink-0 text-muted'>{FAQ_ICONS[index]}</span>
                {t(`landing.faq.${key}.question`)}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>{t(`landing.faq.${key}.answer`)}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
