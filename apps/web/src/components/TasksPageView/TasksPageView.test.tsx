import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { TasksPageView } from './TasksPageView';
import { Page } from '../../types/page';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const basePage: Page = {
  id: 'page-tasks',
  familyId: 'family-1',
  title: 'Sprint Tasks',
  emoji: '✅',
  type: 'tasks',
  items: [],
  taskItems: [
    {
      id: 'task-1',
      text: 'Design mockups',
      assigneeId: null,
      status: 'todo',
      dueDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'task-2',
      text: 'Write tests',
      assigneeId: null,
      status: 'in-progress',
      dueDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'task-3',
      text: 'Deploy',
      assigneeId: null,
      status: 'done',
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

  qc.setQueryData(['pages', 'family-1', 'page-tasks'], page);

  server.use(
    http.get('/api/families/family-1', () =>
      HttpResponse.json({ id: 'family-1', name: 'Smith', emoji: '🏠', members: [] }),
    ),
  );

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TasksPageView page={page} familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TasksPageView', () => {
  it('renders page title and emoji', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sprint Tasks');
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('renders the three status section headers', () => {
    renderView();
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders task text in the correct section', () => {
    renderView();
    expect(screen.getByText('Design mockups')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('done tasks have line-through style', () => {
    renderView();
    const deployEl = screen.getByText('Deploy');
    expect(deployEl.className).toMatch(/line-through/);
  });

  it('renders add task input with correct placeholder', () => {
    renderView();
    expect(screen.getByPlaceholderText(/add task\.\.\./i)).toBeInTheDocument();
  });

  it('adds a new task when Enter is pressed', async () => {
    let postedBody: { text: string; status: string } | undefined;
    server.use(
      http.post('/api/families/family-1/pages/page-tasks/task-items', async ({ request }) => {
        postedBody = (await request.json()) as { text: string; status: string };
        return HttpResponse.json(
          {
            id: 'task-new',
            text: postedBody.text,
            assigneeId: null,
            status: 'todo',
            dueDate: null,
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderView();

    const addInput = screen.getByPlaceholderText(/add task\.\.\./i);
    await user.type(addInput, 'New task{Enter}');

    await waitFor(() => {
      expect(postedBody?.text).toBe('New task');
      expect(postedBody?.status).toBe('todo');
    });
  });

  it('cycles task status on badge click', async () => {
    let patchedBody: { status: string } | undefined;
    server.use(
      http.patch('/api/families/family-1/pages/page-tasks/task-items/:taskId', async ({ request }) => {
        patchedBody = (await request.json()) as { status: string };
        return HttpResponse.json(patchedBody);
      }),
    );

    const user = userEvent.setup();
    renderView();

    // "Design mockups" is in todo, its badge shows "Todo ▾"
    const todoBadge = screen.getByRole('button', { name: /status: todo/i });
    await user.click(todoBadge);

    await waitFor(() => expect(patchedBody?.status).toBe('in-progress'));
  });

  it('shows delete button on hover and calls DELETE', async () => {
    let deleteCalled = false;
    server.use(
      http.delete('/api/families/family-1/pages/page-tasks/task-items/:taskId', () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderView();

    const taskCard = screen.getByText('Design mockups').closest('div[class*="bg-white"]')!;
    await user.hover(taskCard);

    const deleteBtn = within(taskCard).getByRole('button', { name: /delete task/i });
    await user.click(deleteBtn);

    await waitFor(() => expect(deleteCalled).toBe(true));
  });

  it('shows empty state when a section has no tasks', () => {
    const pageNoInProgress: Page = {
      ...basePage,
      taskItems: basePage.taskItems.filter((t) => t.status !== 'in-progress'),
    };
    renderView(pageNoInProgress);
    // The empty state message appears for the in-progress section
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('allows inline title editing', async () => {
    let patchedTitle: string | undefined;
    server.use(
      http.patch('/api/families/family-1/pages/page-tasks', async ({ request }) => {
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
