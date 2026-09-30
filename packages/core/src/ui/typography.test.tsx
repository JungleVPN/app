import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Heading } from './Heading';
import { Paragraph } from './Paragraph';

describe('Paragraph', () => {
  it('uses the default size when no size is passed', () => {
    render(<Paragraph>Body</Paragraph>);

    expect(screen.getByText('Body').className.split(' ')).toContain('text-sm');
  });

  it('lets a passed size replace the default size', () => {
    render(<Paragraph className='text-lg lg:text-lg'>Body</Paragraph>);

    const classes = screen.getByText('Body').className.split(' ');
    expect(classes).toEqual(expect.arrayContaining(['text-lg', 'lg:text-lg']));
    expect(classes).not.toContain('text-sm');
    expect(classes).not.toContain('lg:text-sm');
  });
});

describe('Heading', () => {
  it('uses the size of its level when no size is passed', () => {
    render(<Heading as='h3'>Title</Heading>);

    expect(screen.getByRole('heading', { name: 'Title' }).className.split(' ')).toContain(
      'lg:text-xl',
    );
  });

  it('lets a passed size replace the size of its level', () => {
    render(
      <Heading as='h3' className='text-3xl lg:text-5xl'>
        Title
      </Heading>,
    );

    const classes = screen.getByRole('heading', { name: 'Title' }).className.split(' ');
    expect(classes).toEqual(expect.arrayContaining(['text-3xl', 'lg:text-5xl']));
    expect(classes).not.toContain('text-lg');
    expect(classes).not.toContain('lg:text-xl');
  });
});
