'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if this is a wallet extension error that we should suppress
    const errorMessage = error.message || ''
    const isWalletExtensionError = 
      errorMessage.includes('inpage.js') ||
      errorMessage.includes('postMessage') ||
      errorMessage.includes('handleMessage') ||
      errorMessage.includes('unstable_scheduleCallback') ||
      errorMessage.includes('setImmedia') ||
      errorMessage.includes('extension')

    if (isWalletExtensionError) {
      // Suppress wallet extension errors
      return { hasError: false }
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a wallet extension error that we should suppress
    const errorMessage = error.message || ''
    const isWalletExtensionError = 
      errorMessage.includes('inpage.js') ||
      errorMessage.includes('postMessage') ||
      errorMessage.includes('handleMessage') ||
      errorMessage.includes('unstable_scheduleCallback') ||
      errorMessage.includes('setImmedia') ||
      errorMessage.includes('extension')

    if (!isWalletExtensionError) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Default fallback component
function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
