import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState, Pagination, StatusPill } from './components';

describe('shared dashboard components', () => {
  it('communicates status with text and semantic class', () => {
    render(<StatusPill label="online" tone="good" />);
    const status = screen.getByText('online');
    expect(status).toHaveClass('status-pill--good');
  });

  it('supports keyboard-operable pagination', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={2}
        totalPages={5}
        total={96}
        pageSize={20}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.selectOptions(screen.getByLabelText('Rows'), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('renders recoverable error details and retries', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ErrorState error={new Error('Camera service unavailable')} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Camera service unavailable');
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
