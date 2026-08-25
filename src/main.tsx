import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0F', color: '#f43f5e', fontFamily: 'monospace', padding: 40, gap: 16
        }}>
          <div style={{ fontSize: 32 }}>💥 App Crashed</div>
          <div style={{ fontSize: 16, color: '#fdb022', fontWeight: 700 }}>{this.state.error.message}</div>
          <pre style={{ fontSize: 11, color: '#888', maxWidth: 800, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', background: '#fdb022', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
