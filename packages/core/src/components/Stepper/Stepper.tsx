import { IconCheck } from '@tabler/icons-react';
import {
  Children,
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type LiHTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { cn } from '../../utils';

type StepStatus = 'inactive' | 'active' | 'complete';
type StepperSize = 'sm' | 'md' | 'lg';
type Orientation = 'horizontal' | 'vertical';

type StepperContextValue = {
  currentStep: number;
  orientation: Orientation;
  size: StepperSize;
  onStepChange?: (step: number) => void;
};

type StepContextValue = { index: number; status: StepStatus; isLast: boolean };

const StepperContext = createContext<StepperContextValue | null>(null);
const StepContext = createContext<StepContextValue | null>(null);

function useRequired<T>(value: T | null, name: string): T {
  if (!value) throw new Error(`${name} must be used within Stepper`);
  return value;
}

const statusFor = (index: number, currentStep: number): StepStatus => {
  if (index < currentStep) return 'complete';
  return index === currentStep ? 'active' : 'inactive';
};

/** Per-step state (index, status, whether it is the last) for any descendant of `Stepper.Step`. */
export const useStepperStep = (): StepContextValue =>
  useRequired(useContext(StepContext), 'useStepperStep');

const INDICATOR_SIZE: Record<StepperSize, string> = {
  sm: 'size-[22px] text-xs',
  md: 'size-7 text-sm',
  lg: 'size-9 text-base',
};
const TITLE_SIZE: Record<StepperSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};
const VERTICAL_GAP: Record<StepperSize, string> = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' };

type StepperProps = Omit<HTMLAttributes<HTMLOListElement>, 'children'> & {
  orientation?: Orientation;
  size?: StepperSize;
  /** The active step index; pass it to control the stepper. */
  currentStep?: number;
  defaultStep?: number;
  /** Makes steps clickable. */
  onStepChange?: (step: number) => void;
  children: ReactNode;
};

function StepperRoot({
  orientation = 'horizontal',
  size = 'md',
  currentStep: controlledStep,
  defaultStep = 0,
  onStepChange,
  className,
  children,
  ...props
}: StepperProps) {
  const [internalStep, setInternalStep] = useState(defaultStep);
  const currentStep = controlledStep ?? internalStep;
  const handleStepChange =
    onStepChange &&
    ((step: number) => {
      setInternalStep(step);
      onStepChange(step);
    });
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <StepperContext.Provider
      value={{ currentStep, orientation, size, onStepChange: handleStepChange }}
    >
      <ol
        data-orientation={orientation}
        className={cn(
          'flex w-full',
          orientation === 'horizontal'
            ? 'flex-row items-start justify-center gap-4'
            : cn('flex-col', VERTICAL_GAP[size]),
          className,
        )}
        {...props}
      >
        {steps.map((step, index) => (
          <StepContext.Provider
            key={step.key ?? index}
            value={{
              index,
              status: statusFor(index, currentStep),
              isLast: index === steps.length - 1,
            }}
          >
            {step}
          </StepContext.Provider>
        ))}
      </ol>
    </StepperContext.Provider>
  );
}

function StepperStep({ className, children, ...props }: LiHTMLAttributes<HTMLLIElement>) {
  const { orientation, onStepChange } = useRequired(useContext(StepperContext), 'Stepper.Step');
  const { index, status } = useStepContext();
  const isHorizontal = orientation === 'horizontal';
  const body = (
    <span
      className={cn(
        'flex items-center gap-3 text-center',
        isHorizontal ? 'flex-row' : 'flex-col items-center',
      )}
    >
      {children}
    </span>
  );

  return (
    <li
      data-status={status}
      aria-current={status === 'active' ? 'step' : undefined}
      className={cn(
        'relative flex',
        isHorizontal ? 'items-center gap-3 last:flex-none' : 'flex-col',
        className,
      )}
      {...props}
    >
      {onStepChange ? (
        <button
          type='button'
          data-clickable='true'
          className='flex cursor-pointer items-center gap-3 rounded-lg outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent active:opacity-60'
          onClick={() => onStepChange(index)}
        >
          {body}
        </button>
      ) : (
        body
      )}
    </li>
  );
}

const useStepContext = (): StepContextValue => useRequired(useContext(StepContext), 'Stepper.Step');

function StepperIndicator({ className, children }: { className?: string; children?: ReactNode }) {
  const { size } = useRequired(useContext(StepperContext), 'Stepper.Indicator');
  const { index, status } = useStepContext();

  return (
    <span
      data-status={status}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors',
        INDICATOR_SIZE[size],
        status === 'inactive' && 'border-border text-muted',
        status === 'active' && 'border-accent text-accent',
        status === 'complete' && 'border-accent bg-accent text-accent-foreground',
        className,
      )}
    >
      {children ?? (status === 'complete' ? <IconCheck size='60%' stroke={3} /> : index + 1)}
    </span>
  );
}

function StepperIcon({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('flex items-center justify-center', className)} {...props} />;
}

function StepperContent({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('flex flex-col', className)} {...props} />;
}

function StepperTitle({ className, ...props }: ComponentProps<'span'>) {
  const { size } = useRequired(useContext(StepperContext), 'Stepper.Title');
  const { status } = useStepContext();

  return (
    <span
      className={cn(
        'font-medium',
        TITLE_SIZE[size],
        status === 'inactive' ? 'text-muted' : 'text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function StepperDescription({ className, ...props }: ComponentProps<'span'>) {
  const { size } = useRequired(useContext(StepperContext), 'Stepper.Description');

  return (
    <span
      className={cn('text-muted', size === 'lg' ? 'text-sm' : 'text-xs', className)}
      {...props}
    />
  );
}

type StepperSeparatorProps = HTMLAttributes<HTMLDivElement> & {
  /** Fill from 0 to 1; follows the current step when omitted. */
  progress?: number;
  /** Render even on the last step. */
  force?: boolean;
};

function StepperSeparator({ progress, force = false, className, ...props }: StepperSeparatorProps) {
  const { orientation, size } = useRequired(useContext(StepperContext), 'Stepper.Separator');
  const { status, isLast } = useStepContext();
  if (isLast && !force) return null;

  const fill = progress ?? (status === 'complete' ? 1 : 0);
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      data-slot='separator'
      data-complete={fill >= 1 || undefined}
      aria-hidden='true'
      className={cn(
        'relative overflow-hidden rounded-full bg-border',
        isHorizontal ? 'h-0.5 min-w-6 flex-1' : 'min-h-6 w-0.5 flex-1',
        !isHorizontal && 'self-start',
        className,
      )}
      style={
        !isHorizontal
          ? { marginInlineStart: `calc(${INDICATOR_SIZE_PX[size]}px / 2 - 1px)` }
          : undefined
      }
      {...props}
    >
      <div
        className={cn(
          'absolute inset-0 origin-left bg-accent transition-transform duration-300',
          !isHorizontal && 'origin-top',
        )}
        style={{ transform: isHorizontal ? `scaleX(${fill})` : `scaleY(${fill})` }}
      />
    </div>
  );
}

const INDICATOR_SIZE_PX: Record<StepperSize, number> = { sm: 22, md: 28, lg: 36 };

export const Stepper = Object.assign(StepperRoot, {
  Step: StepperStep,
  Indicator: StepperIndicator,
  Icon: StepperIcon,
  Content: StepperContent,
  Title: StepperTitle,
  Description: StepperDescription,
  Separator: StepperSeparator,
});
