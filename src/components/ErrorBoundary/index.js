import React, { Component } from 'react';

/**
 * Error Boundary component to catch and handle errors in child components.
 * Prevents a single widget error from crashing the entire page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging (in production, this could send to an error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback: render nothing for widgets to not disrupt the page
      // For critical components, you might want to show a message
      if (this.props.showMessage) {
        return (
          <div style={{ 
            padding: '10px', 
            color: 'var(--ifm-color-emphasis-600)',
            fontSize: '0.9em',
            textAlign: 'center'
          }}>
            {this.props.errorMessage || 'Something went wrong. Please refresh the page.'}
          </div>
        );
      }

      // Default: render nothing (best for optional widgets)
      return null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
