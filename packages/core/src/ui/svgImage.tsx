import type { FunctionComponent, SVGProps } from 'react';

export type SvgImageProps = Pick<
  SVGProps<SVGSVGElement>,
  'className' | 'aria-hidden' | 'focusable'
> & {
  loading?: 'eager' | 'lazy';
};

type SvgImageOptions = {
  src: string;
  width: number;
  height: number;
  className?: string;
};

/**
 * Serves a large illustration as a cacheable, lazily fetched file instead of inlining its
 * path data into the JS bundle. Stands in for the svgr component: `className` replaces the
 * sizing classes the SVG carried on its root element, exactly as it did when inlined.
 */
export function svgImage({ src, width, height, className: defaultClassName }: SvgImageOptions) {
  const aspectRatio = `${width} / ${height}`;

  const SvgImage: FunctionComponent<SvgImageProps> = ({ className, loading = 'lazy' }) => (
    <img
      src={src}
      alt=''
      aria-hidden='true'
      loading={loading}
      decoding='async'
      className={className ?? defaultClassName}
      style={{ aspectRatio }}
    />
  );

  return SvgImage;
}
