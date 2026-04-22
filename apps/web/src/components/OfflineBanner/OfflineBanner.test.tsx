import { render, screen, act } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => {
    act(() => {
      onlineManager.setOnline(undefined);
    });
  });

  it('renders nothing when online', () => {
    act(() => {
      onlineManager.setOnline(true);
    });
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the offline banner when offline', () => {
    act(() => {
      onlineManager.setOnline(false);
    });
    render(<OfflineBanner />);
    expect(
      screen.getByText("You're offline — changes will sync when you reconnect"),
    ).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    act(() => {
      onlineManager.setOnline(false);
    });
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
