'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
          <p className="text-lg font-semibold text-slate-800 mb-2">Algo salió mal</p>
          <p className="text-sm text-slate-500 mb-4">
            {this.state.message || 'Error inesperado. Intentá recargar la página.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
