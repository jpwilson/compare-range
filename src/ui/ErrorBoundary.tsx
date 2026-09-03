import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Backstop so an uncaught render/effect error can never leave a blank screen —
 * it shows a recover card and logs the error instead of unmounting the whole tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[CompareRange] crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="welcome" style={{ position: 'fixed' }}>
        <h3>Something went wrong</h3>
        <p>The app hit an unexpected error. Reloading usually fixes it.</p>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
