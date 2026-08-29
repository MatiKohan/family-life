import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './BottomNav';

function renderNav() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/family/family-1']}>
        <BottomNav familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BottomNav', () => {
  it('includes an Activity tab to the family activity feed', () => {
    renderNav();
    const link = screen.getByRole('link', { name: /activity/i });
    expect(link).toHaveAttribute('href', '/family/family-1/activity');
  });

  it('keeps Pages, Calendar, New page, and Settings', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /pages/i })).toHaveAttribute('href', '/family/family-1');
    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('href', '/family/family-1/calendar');
    expect(screen.getByRole('button', { name: /\+ new page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/family/family-1/settings',
    );
  });
});
