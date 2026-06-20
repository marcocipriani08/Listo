import * as React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props!: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by Listo ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-[#030f0f] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-[#030f0f]/85 backdrop-blur-2xl max-w-md w-full p-8 rounded-3xl border border-red-500/30 shadow-2xl space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white font-display">Ops, si è verificato un errore</h2>
              <p className="text-slate-400 text-xs">Si è verificato un errore imprevisto durante il rendering o il caricamento dell'applicazione.</p>
            </div>

            {this.state.error && (
              <div className="bg-red-955/25 border border-red-500/15 rounded-2xl p-4 w-full text-left font-mono text-[10px] text-red-300 max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                {this.state.error.stack || this.state.error.toString()}
              </div>
            )}

            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch (e) {
                  console.error(e);
                }
                window.location.reload();
              }}
              className="w-full bg-[#03624c] hover:bg-[#00df82] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-all cursor-pointer shadow-lg border border-[#00df82]/20"
            >
              Ripristina cache e Riavvia
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
