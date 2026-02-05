import React from 'react';
import { render, screen } from '@testing-library/react';
import { RedFlagIndex } from './visualizations/RedFlagIndex';

describe('RedFlagIndex Component', () => {
  test('renders correctly with value 0', () => {
    render(<RedFlagIndex value={0} />);
    expect(screen.getByText('🏳️')).toBeInTheDocument();
  });

  test('renders correctly with value 3', () => {
    render(<RedFlagIndex value={3} />);
    expect(screen.getByText('🚩🚩🚩')).toBeInTheDocument();
  });

  test('renders correctly with value 5', () => {
    render(<RedFlagIndex value={5} />);
    expect(screen.getByText('🚩🚩🚩🚩🚩')).toBeInTheDocument();
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
    expect(screen.getByText('🚩🚩🚩🚩🚩')).toBeInTheDocument();
  });

  test('handles negative values', () => {
    render(<RedFlagIndex value={-1} />);
    expect(screen.getByText('🏳️')).toBeInTheDocument();
  });

  // New tests for variants
  test('renders text variant correctly', () => {
    render(<RedFlagIndex value={3} variant="text" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  test('renders icon variant correctly', () => {
    render(<RedFlagIndex value={2} variant="icon" />);
    expect(screen.getByText('🚩🚩')).toBeInTheDocument();
  });

  test('defaults to emoji variant when unspecified', () => {
    render(<RedFlagIndex value={1} />);
    expect(screen.getByText('🚩')).toBeInTheDocument();
  });

  test('applies correct size classes', () => {
    const { container } = render(<RedFlagIndex value={3} size="sm" />);
    const flagElement = container.querySelector('span');
    expect(flagElement).toHaveClass('text-xs');
  });

  // New tests for color-blind friendly features
  test('renders combined variant correctly', () => {
    render(<RedFlagIndex value={3} variant="combined" showTextLabel={true} />);
    expect(screen.getByText('🚩🚩🚩')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  test('does not show text label in combined variant when showTextLabel is false', () => {
    render(<RedFlagIndex value={3} variant="combined" showTextLabel={false} />);
    expect(screen.getByText('🚩🚩🚩')).toBeInTheDocument();
    expect(screen.queryByText('High')).not.toBeInTheDocument();
  });

  test('includes aria-label for accessibility', () => {
    render(<RedFlagIndex value={3} variant="text" />);
    const element = screen.getByText('High');
    expect(element).toHaveAttribute('aria-label');
  });
});
