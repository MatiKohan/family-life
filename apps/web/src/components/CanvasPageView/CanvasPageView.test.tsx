import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { CanvasPageView } from './CanvasPageView';
import type { Page } from '../../types/page';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const basePage: Page = {
  id: 'page-1',
  familyId: 'family-1',
  title: 'Groceries',
  emoji: '🛒',
  type: 'list',
  items: [],
  blocks: [
    {
      id: 'block-1',
      type: 'list',
      title: 'Shopping',
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
    },
    {
      id: 'block-2',
      type: 'text',
      title: 'Notes',
      content: 'Some notes here',
    },
  ],
  taskItems: [],
  eventIds: [],
  apartmentListings: [],
  metadata: {},
  lastSyncedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderView(page: Page = basePage) {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['pages', 'family-1', 'page-1'], page);

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CanvasPageView page={page} familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CanvasPageView', () => {
  it('renders page title and emoji', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Groceries');
    expect(screen.getByText('🛒')).toBeInTheDocument();
  });

  it('renders list block with items', () => {
    renderView();
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
  });

  it('renders text block content', () => {
    renderView();
    const textarea = screen.getByDisplayValue('Some notes here');
    expect(textarea).toBeInTheDocument();
  });

  it('renders block titles', () => {
    renderView();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('renders add list block and add text block buttons', () => {
    renderView();
    expect(screen.getByRole('button', { name: /\+ list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ text/i })).toBeInTheDocument();
  });

  it('adds a new list block on click', async () => {
    const user = userEvent.setup();
    renderView();

    const addListBtn = screen.getByRole('button', { name: /\+ list/i });
    await user.click(addListBtn);

    // A new block should appear — check there are now 2 add-item inputs (one per list block)
    const addInputs = screen.getAllByPlaceholderText(/\+ add item/i);
    expect(addInputs.length).toBe(2);
  });

  it('adds a new text block on click', async () => {
    const user = userEvent.setup();
    renderView();

    const addTextBtn = screen.getByRole('button', { name: /\+ text/i });
    await user.click(addTextBtn);

    // Should have an additional textarea now (original text block + new one)
    const textareas = screen.getAllByRole('textbox');
    // Filter to only text block textareas (block title inputs are also textboxes)
    const contentTextareas = textareas.filter(
      (el) => el.tagName === 'TEXTAREA',
    );
    expect(contentTextareas.length).toBe(2);
  });

  it('checked items in list block have line-through style', () => {
    renderView();
    const eggsEl = screen.getByText('Eggs');
    expect(eggsEl.className).toMatch(/line-through/);
  });

  it('calls PATCH when toggling a list item', async () => {
    let patchedBody: unknown;
    server.use(
      http.patch(
        '/api/families/family-1/pages/page-1/blocks/block-1/items/item-1',
        async ({ request }) => {
          patchedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    const user = userEvent.setup();
    renderView();

    const milkCheckbox = screen.getByRole('checkbox', { name: /mark as complete/i });
    await user.click(milkCheckbox);

    await waitFor(() => expect(patchedBody).toEqual({ checked: true }));
  });

  it('calls DELETE when deleting a list item', async () => {
    let deleteCalled = false;
    server.use(
      http.delete(
        '/api/families/family-1/pages/page-1/blocks/block-1/items/item-1',
        () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    const user = userEvent.setup();
    renderView();

    const deleteButtons = screen.getAllByRole('button', { name: /delete item/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => expect(deleteCalled).toBe(true));
  });

  it('adds item to list block via POST', async () => {
    let postedText: string | undefined;
    server.use(
      http.post(
        '/api/families/family-1/pages/page-1/blocks/block-1/items',
        async ({ request }) => {
          const body = (await request.json()) as { text: string };
          postedText = body.text;
          return HttpResponse.json(
            {
              id: 'item-new',
              text: body.text,
              checked: false,
              assigneeId: null,
              dueDate: null,
              createdAt: new Date().toISOString(),
            },
            { status: 201 },
          );
        },
      ),
    );

    const user = userEvent.setup();
    renderView();

    const addInput = screen.getAllByPlaceholderText(/\+ add item/i)[0];
    await user.type(addInput, 'Butter{Enter}');

    await waitFor(() => expect(postedText).toBe('Butter'));
  });

  it('calls PUT /blocks when adding a new block (debounced)', async () => {
    let putCalled = false;
    server.use(
      http.put('/api/families/family-1/pages/page-1/blocks', () => {
        putCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: /\+ list/i }));

    await waitFor(() => expect(putCalled).toBe(true), { timeout: 2000 });
  });

  it('allows editing page title inline', async () => {
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

  it('renders empty canvas with no blocks', () => {
    const emptyPage: Page = { ...basePage, blocks: [] };
    renderView(emptyPage);
    expect(screen.getByRole('button', { name: /\+ list/i })).toBeInTheDocument();
    expect(screen.queryByText('Milk')).not.toBeInTheDocument();
  });

  it('renders page with undefined blocks gracefully', () => {
    const pageNoBlocks: Page = { ...basePage, blocks: undefined };
    renderView(pageNoBlocks);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Groceries');
    expect(screen.getByRole('button', { name: /\+ list/i })).toBeInTheDocument();
  });
});
