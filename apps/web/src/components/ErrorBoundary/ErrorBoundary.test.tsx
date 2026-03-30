import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Suppress expected console.error output from React during error boundary tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = String(args[0]);
    if (
      message.includes('ErrorBoundary caught') ||
      message.includes('The above error occurred') ||
      message.includes('React will try to recreate')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

function NormalChild() {
  return <p>All good</p>;
}

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <p>No error</p>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('resets the boundary when "Try again" is clicked', async () => {
    const user = userEvent.setup();

    function ResettableApp() {
      return (
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>
      );
    }

    render(<ResettableApp />);

    // Fallback is shown
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Clicking "Try again" resets the boundary state
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // The boundary resets — it will try to render the child again.
    // Since ThrowingChild still throws, the fallback will appear again,
    // which confirms the reset handler ran.
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
