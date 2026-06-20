// First set up global handlers to catch early load/import crashes before any other code is imported
const renderCrashScreen = (title: string, error: string, stack?: string) => {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="min-height: 100dvh; background-color: #030f0f; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; box-sizing: border-box;">
        <div style="background-color: rgba(3, 98, 76, 0.1); border: 1px solid rgba(0, 223, 130, 0.2); border-radius: 24px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 20px;">
          <div style="width: 64px; height: 64px; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ef4444;">
            <svg style="width: 32px; height: 32px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          </div>
          <div style="width: 100%;">
            <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px 0; color: #ffffff;">Errore di caricamento Listo</h2>
            <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">${title}</p>
          </div>
          <div style="background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; font-family: monospace; font-size: 11px; text-align: left; width: 100%; color: #fca5a5; overflow-y: auto; white-space: pre-wrap; word-break: break-all; box-sizing: border-box; max-height: 180px;">
            <strong>${error}</strong>\n${stack || ''}
          </div>
          <button onclick="try{localStorage.clear();sessionStorage.clear();}catch(e){}location.reload();" style="width: 100%; background-color: #03624c; color: white; border: 1px solid rgba(0, 223, 130, 0.24); padding: 14.5px; border-radius: 12.5px; font-weight: bold; font-size: 12px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s;">
            Ripristina cache e Ricarica
          </button>
        </div>
      </div>
    `;
  }
};

window.addEventListener('error', (event) => {
  const errMessage = event.error ? event.error.toString() : event.message;
  const errStack = event.error ? event.error.stack : '';
  renderCrashScreen("Errore critico durante l'inizializzazione dell'applicazione.", errMessage, errStack);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const errMessage = reason ? reason.toString() : 'Promessa non gestita rifiutata';
  const errStack = reason && reason.stack ? reason.stack : '';
  renderCrashScreen("Errore di rete o database asincrono non gestito.", errMessage, errStack);
});

import {StrictMode, Component, ErrorInfo, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by Listo ErrorBoundary:", error, errorInfo);
  }

  public override render() {
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
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
