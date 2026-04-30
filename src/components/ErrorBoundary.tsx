import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message?: string }

/**
 * Évite l’écran blanc si une erreur React survient (navigateur ancien, extension, etc.).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
          <h1 className="text-lg font-semibold">Erreur au chargement</h1>
          <p className="mt-2 text-sm">
            Rechargez la page. Si l’app est installée (PWA), essayez de vider le cache du site ou de la
            désinstaller puis rouvrir l’URL.
          </p>
          {this.state.message && (
            <pre className="mt-4 overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-600">
              {this.state.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
