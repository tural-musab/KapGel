/**
 * Error Boundary Component
 * 
 * Catches React errors and reports to Sentry
 * Based on plan.md: Hafta 3, Gün 13-14
 */

'use client'

import { Component, ReactNode, ErrorInfo } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Bir şeyler ters gitti</h2>
              <p className="text-gray-600 mb-4">
                Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
