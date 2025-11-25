import React from 'react';
import { render, screen } from '@testing-library/react';
import { RedFlagIndex } from './RedFlagIndex';

describe('RedFlagIndex Component', () => {
  test('renders correctly with value 0', () => {
    render(<RedFlagIndex value={0} />);
    expect(screen.getByTitle('Red Flag Index: 0/5 - No Red Flags')).toBeInTheDocument();
  });

  test('renders correctly with value 3', () => {
    render(<RedFlagIndex value={3} />);
    expect(screen.getByTitle('Red Flag Index: 3/5 - Significant Red Flags')).toBeInTheDocument();
  });

  test('renders correctly with value 5', () => {
    render(<RedFlagIndex value={5} />);
    expect(screen.getByTitle('Red Flag Index: 5/5 - Critical Red Flags')).toBeInTheDocument();
  });

  test('shows label when showLabel is true', () => {
    render(<RedFlagIndex value={3} showLabel={true} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  test('shows description when showDescription is true', () => {
    render(<RedFlagIndex value={3} showDescription={true} />);
    expect(screen.getByText('Significant Red Flags')).toBeInTheDocument();
  });

  test('shows legend when showLegend is true', () => {
    render(<RedFlagIndex value={5} showLegend={true} />);
    expect(screen.getByText('Critical attention')).toBeInTheDocument();
  });

  test('handles out of range values', () => {
    render(<RedFlagIndex value={10} />);
    expect(screen.getByTitle('Red Flag Index: 5/5 - Critical Red Flags')).toBeInTheDocument();
  });

  test('handles negative values', () => {
    render(<RedFlagIndex value={-1} />);
    expect(screen.getByTitle('Red Flag Index: 0/5 - No Red Flags')).toBeInTheDocument();
  });
});