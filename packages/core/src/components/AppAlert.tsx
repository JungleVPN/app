import { Alert, Surface } from '@heroui/react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAlertStore } from '../stores';

export function AppAlert() {
  const { t } = useTranslation();
  const alert = useAlertStore((s) => s.alert);

  return createPortal(
    <motion.div
      className='fixed top-4 left-1/2 w-[90%] max-w-[425px] -translate-x-1/2'
      style={{ zIndex: 9999 }}
      initial={false}
      animate={{ y: alert ? 0 : 'calc(-100% - 16px)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      <Surface variant='tertiary' className='rounded-3xl'>
        <Alert status={alert?.variant ?? 'danger'} style={{ background: 'inherit' }}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{alert ? t(alert.messageKey) : ''}</Alert.Title>
          </Alert.Content>
        </Alert>
      </Surface>
    </motion.div>,
    document.body,
  );
}
