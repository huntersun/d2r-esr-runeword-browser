import { Component, type ReactNode } from 'react';

interface GuideCardBoundaryProps {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

interface GuideCardBoundaryState {
  readonly failed: boolean;
}

/**
 * Keeps a failing embedded item card (typically its lazy chunk failing to load after a deploy) from taking the whole
 * note down to the route error screen: the card degrades to `fallback` instead. Error boundaries still need a class.
 */
export class GuideCardBoundary extends Component<GuideCardBoundaryProps, GuideCardBoundaryState> {
  override state: GuideCardBoundaryState = { failed: false };

  static getDerivedStateFromError(): GuideCardBoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
