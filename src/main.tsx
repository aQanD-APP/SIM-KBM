import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          background: '#f8fafc',
          color: '#1e293b',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Aplikasi gagal dimuat</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center' }}>
            {this.state.message || 'Terjadi kesalahan yang tidak terduga.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '10px 24px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="color:red">Root element not found</div>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
