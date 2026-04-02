import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ListPageView } from './ListPageView';
import { Page } from '../../types/page';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const basePage: Page = {
  _id: 'page-1',
  familyId: 'family-1',
  title: 'Groceries',
  emoji: '🛒',
  type: 'list',
  items: [
    {
      id: 'item-1',
      text: 'Milk',
      checked: false,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'item-2',
      text: 'Eggs',
      checked: true,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  eventIds: [],
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderView(page: Page = basePage) {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // Seed query cache with the page data so ListPageView mutations work optimistically
  qc.setQueryData(['pages', 'family-1', 'page-1'], page);

  // Mock the family endpoint (needed for member list)
  server.use(
    http.get('/api/families/family-1', () =>
      HttpResponse.json({ id: 'family-1', name: 'Smith', emoji: '🏠', members: [] }),
    ),
  );

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ListPageView page={page} familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ListPageView', () => {
  it('renders page title and emoji', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Groceries');
    expect(screen.getByText('🛒')).toBeInTheDocument();
  });

  it('renders all list items', () => {
    renderView();
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
  });

  it('checked items have line-through style class', () => {
    renderView();
    const eggsEl = screen.getByText('Eggs');
    expect(eggsEl.className).toMatch(/line-through/);
  });

  it('renders add item input placeholder', () => {
    renderView();
    expect(screen.getByPlaceholderText(/\+ add item/i)).toBeInTheDocument();
  });

  it('adds a new item when Enter is pressed', async () => {
    let postedText: string | undefined;
    server.use(
      http.post('/api/families/family-1/pages/page-1/items', async ({ request }) => {
        const body = (await request.json()) as { text: string };
        postedText = body.text;
        return HttpResponse.json(
          { id: 'item-new', text: body.text, checked: false, assigneeId: null, dueDate: null, createdAt: new Date().toISOString() },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderView();

    const addInput = screen.getByPlaceholderText(/\+ add item/i);
    await user.type(addInput, 'Butter{Enter}');

    await waitFor(() => expect(postedText).toBe('Butter'));
  });

  it('toggles item checked state on checkbox click', async () => {
    let patchedBody: unknown;
    server.use(
      http.patch('/api/families/family-1/pages/page-1/items/:itemId', async ({ request }) => {
        patchedBody = await request.json();
        return HttpResponse.json(patchedBody);
      }),
    );

    const user = userEvent.setup();
    renderView();

    const milkCheckbox = screen.getByRole('checkbox', { name: /mark as complete/i });
    await user.click(milkCheckbox);

    await waitFor(() => expect(patchedBody).toEqual({ checked: true }));
  });

  it('shows delete button on hover and calls DELETE', async () => {
    let deleteCalled = false;
    server.use(
      http.delete('/api/families/family-1/pages/page-1/items/:itemId', () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderView();

    const milkRow = screen.getByText('Milk').closest('div')!;
    await user.hover(milkRow);

    const deleteBtn = within(milkRow).getByRole('button', { name: /delete item/i });
    await user.click(deleteBtn);

    await waitFor(() => expect(deleteCalled).toBe(true));
  });

  it('shows overdue badge in red for past due date', () => {
    const pageWithOverdue: Page = {
      ...basePage,
      items: [
        {
          ...basePage.items[0],
          dueDate: '2020-01-01',
        },
      ],
    };
    renderView(pageWithOverdue);
    const badge = screen.getByRole('button', { name: /due.*overdue/i });
    expect(badge.className).toMatch(/red/);
  });

  it('allows editing the title inline', async () => {
    let patchedTitle: string | undefined;
    server.use(
      http.patch('/api/families/family-1/pages/page-1', async ({ request }) => {
        const body = (await request.json()) as { title: string };
        patchedTitle = body.title;
        return HttpResponse.json({ ...basePage, title: body.title });
      }),
    );

    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('heading', { level: 1 }));
    const input = screen.getByRole('textbox', { name: /page title/i });
    await user.clear(input);
    await user.type(input, 'New Title');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(patchedTitle).toBe('New Title'));
  });
});
