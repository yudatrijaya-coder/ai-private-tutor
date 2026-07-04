"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex items-center justify-center min-h-[200px] p-8"
          style={{ backgroundColor: "var(--su-bg-card, #181b24)" }}
        >
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">😅</div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: "var(--su-text, #e8eaed)", fontFamily: "var(--font-display, sans-serif)" }}
            >
              Ups, ada yang error!
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--su-text-dim, #8b8fa3)" }}>
              Bagian ini bermasalah. Jangan khawatir, sisanya masih berfungsi normal.
            </p>
            <button
              onClick={this.handleReset}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: "var(--su-accent, #6366f1)" }}
            >
              Coba Lagi
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs cursor-pointer" style={{ color: "var(--su-text-dim)" }}>
                  Detail Error
                </summary>
                <pre
                  className="mt-2 p-3 rounded-lg text-xs overflow-auto max-h-40"
                  style={{
                    backgroundColor: "var(--su-bg, #0f1117)",
                    color: "var(--su-danger, #ef4444)",
                    border: "1px solid var(--su-border, #2a2e3a)",
                  }}
                >
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
