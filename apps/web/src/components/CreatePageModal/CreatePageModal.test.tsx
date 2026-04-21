import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { CreatePageModal } from './CreatePageModal';
import { useAuthStore } from '../../store/auth.store';
import { PageSummary } from '../../types/page';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderModal(
  onClose = vi.fn(),
  onCreated: (p: PageSummary) => void = vi.fn(),
) {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onClose,
    onCreated,
    ...render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <CreatePageModal familyId="family-1" onClose={onClose} onCreated={onCreated} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('CreatePageModal', () => {
  it('renders modal with title input and type selector', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /new page/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('Create button is disabled when title is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('enables Create button after typing a title', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/title/i), 'My list');
    expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('submits form and calls onCreated with returned page', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderModal(vi.fn(), onCreated);

    await user.type(screen.getByLabelText(/title/i), 'Groceries');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Groceries' }),
    ));
  });

  it('shows error message when API fails', async () => {
    server.use(
      http.post('/api/families/:familyId/pages', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/title/i), 'Test');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to create page/i)).toBeInTheDocument(),
    );
  });

  it('Apartments type button is enabled', () => {
    renderModal();
    const apartmentsBtn = screen.getByRole('button', { name: /apartments/i });
    expect(apartmentsBtn).not.toBeDisabled();
  });

  it('allows selecting a different emoji', async () => {
    const user = userEvent.setup();
    renderModal();
    // Open the emoji picker first
    await user.click(screen.getByRole('button', { name: /icon/i }));
    // Then select the emoji
    const shoppingCartBtn = screen.getByRole('button', { name: /select emoji 🛒/i });
    await user.click(shoppingCartBtn);
    // Picker closes and selected emoji is reflected on the trigger button
    expect(screen.queryByRole('button', { name: /select emoji 🛒/i })).not.toBeInTheDocument();
  });
});
