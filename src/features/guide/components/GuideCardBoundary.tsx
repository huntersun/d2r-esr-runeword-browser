import { Component, type ReactNode } from 'react';

interface Props {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
}

/**
 * Keeps a failing embedded item card (typically its lazy chunk failing to load after a deploy) from taking the whole
 * note down to the route error screen: the card degrades to `fallback` instead. Error boundaries still need a class.
 */
export class GuideCardBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
