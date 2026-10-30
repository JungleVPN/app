import { Button } from '@heroui/react';
import { useInView } from 'framer-motion';
import {
  createContext,
  Dispatch,
  ReactNode,
  RefObject,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../hooks';
import { PRICING_PATH } from '../../../utils';

type ScrollCtaState = {
  blockersInView: number;
  setBlockersInView: Dispatch<SetStateAction<number>>;
};

const ScrollCtaContext = createContext<ScrollCtaState | null>(null);

function useScrollCtaState() {
  const state = useContext(ScrollCtaContext);
  if (!state) throw new Error('ScrollCta and HidesScrollCta must be inside ScrollCtaProvider');
  return state;
}

export function ScrollCtaProvider({ children }: { children: ReactNode }) {
  const [blockersInView, setBlockersInView] = useState(0);

  return (
    <ScrollCtaContext.Provider value={{ blockersInView, setBlockersInView }}>
      {children}
    </ScrollCtaContext.Provider>
  );
}

type HidesScrollCtaProps = {
  children: ReactNode;
  /** Share of the section (0–1) that must be on screen before the CTA steps aside. */
  amount?: number;
};

/**
 * Marks a section the scroll CTA steps aside for. `amount` is a share of the
 * section's own height, so for a section taller than the screen keep it below
 * viewport height / section height or it can never count as in view.
 */
export function HidesScrollCta({ children, amount = 0.1 }: HidesScrollCtaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount });
  const { setBlockersInView } = useScrollCtaState();

  useEffect(() => {
    if (!isInView) return;
    setBlockersInView((count) => count + 1);
    return () => setBlockersInView((count) => count - 1);
  }, [isInView, setBlockersInView]);

  return <div ref={ref}>{children}</div>;
}

type ScrollCtaProps = {
  /** The CTA shows once this element has scrolled up out of view. */
  afterRef: RefObject<HTMLElement | null>;
};

/**
 * CTA pinned to the bottom of the screen once the visitor scrolls past the
 * hero, stepping aside while a `HidesScrollCta` section is in view. The
 * wrapper stays transparent and off the bottom edge so iOS 26 Safari keeps
 * fading its toolbar over the page instead of tinting it.
 */
export function ScrollCta({ afterRef }: ScrollCtaProps) {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { blockersInView } = useScrollCtaState();
  const isHeroInView = useInView(afterRef, { initial: true });
  const isVisible = !isHeroInView && blockersInView === 0;

  const handleClick = useCallback(() => {
    navigate(PRICING_PATH);
  }, [navigate]);

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={`fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none bottom-[max(1rem,env(safe-area-inset-bottom))] transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <Button
        size='sm'
        variant='primary'
        className='pointer-events-auto h-14 px-8 rounded-4xl font-bold shadow-lg shadow-violet-500/30 hover:opacity-90'
        onClick={handleClick}
      >
        {t('common.cta')}
      </Button>
    </div>
  );
}
