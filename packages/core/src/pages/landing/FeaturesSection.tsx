import {
  IconCircleCheck,
  IconCurrencyDollar,
  IconDeviceMobile,
  IconHeartHandshake,
  IconInfinity,
  IconLock,
} from '@tabler/icons-react';
import { FeatureCard } from '../../components/FeatureCard';

const features = [
  {
    icon: <IconCircleCheck size={36} stroke={1.5} />,
    title: 'Мгновенный доступ',
    description: 'Подключение за 2 минуты — никаких сложных настроек.',
  },
  {
    icon: <IconCurrencyDollar size={36} stroke={1.5} />,
    title: 'Гарантия возврата',
    description: 'Вернём деньги, если не откроется нужный сайт.',
  },
  {
    icon: <IconLock size={36} stroke={1.5} />,
    title: 'Защита данных',
    description: 'Ваши данные и трафик под надёжной защитой.',
  },
  {
    icon: <IconInfinity size={36} stroke={1.5} />,
    title: 'Безлимитная скорость',
    description: 'Нет ограничений по трафику и скорости.',
  },
  {
    icon: <IconDeviceMobile size={36} stroke={1.5} />,
    title: 'Для всех устройств',
    description: 'Работает на телефоне, ноутбуке и даже роутере.',
  },
  {
    icon: <IconHeartHandshake size={36} stroke={1.5} />,
    title: 'Дружелюбная поддержка',
    description: 'Поможем в любой ситуации — отвечаем за ~10 минут.',
  },
] as const;

export function FeaturesSection() {
  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          Почему выбирают <span className='text-primary'>VPN Наоборот</span>
        </h2>
        <p className='text-muted text-base lg:text-lg'>
          6 причин, почему нам доверяют тысячи пользователей по всему миру
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
}
