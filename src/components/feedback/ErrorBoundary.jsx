import { Component } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Button from "../ui/Button";

/**
 * Catches render-time crashes so a single bad component can't white-screen the
 * whole app. Shows the error in development and a friendly recovery card in
 * production, with a "reload" and a "back home" escape hatch.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Surfaced in the browser console and picked up by the smoke test.
    console.error("[Programmer's Hub] render error:", error, info?.componentStack);
  }

  reset() {
    this.setState({ error: null, info: null });
  }

  render() {
    const { error, info } = this.state;
    const { children, title = "Something broke on this page" } = this.props;

    if (!error) return children;

    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-rose-400/30 bg-surface p-7 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The rest of the app is fine — this screen hit an unexpected error while rendering. You can try
            again, reload the page, or head back home.
          </p>

          <pre className="mt-5 max-h-40 overflow-auto rounded-xl border border-line bg-bg-elev/60 p-3 text-left font-mono text-[0.72rem] leading-relaxed text-rose-200">
            {String(error?.message || error)}
          </pre>

          {import.meta.env.DEV && info?.componentStack ? (
            <details className="mt-3 text-left">
              <summary className="cursor-pointer text-xs font-semibold text-muted">Component stack</summary>
              <pre className="mt-2 max-h-52 overflow-auto rounded-xl border border-line bg-bg-elev/60 p-3 font-mono text-[0.68rem] text-muted">
                {info.componentStack}
              </pre>
            </details>
          ) : null}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button icon={RefreshCw} onClick={this.reset}>
              Try again
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => window.location.reload()}
              className="hidden sm:inline-flex"
            >
              Reload page
            </Button>
            <Button variant="ghost" to="/" icon={Home}>
              Back home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
