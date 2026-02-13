"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  fallback?: ReactNode;
  label?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="h-full flex flex-col items-center justify-center text-xs font-mono p-4">
          <span className="text-terminal-red mb-1">
            {this.props.label || "Component"} failed to render
          </span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-terminal-amber hover:text-terminal-text transition-colors"
          >
            Click to retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
