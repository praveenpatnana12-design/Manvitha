import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', background: '#0f172a', color: '#f1f5f9', minHeight: '100vh' }}>
          <h1 style={{ color: '#f87171', fontSize: '24px', marginBottom: '12px' }}>⚠️ Application Error</h1>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Something went wrong loading the portal. Please try refreshing.</p>
          <pre style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', fontSize: '12px', color: '#fbbf24', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#025ecb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
