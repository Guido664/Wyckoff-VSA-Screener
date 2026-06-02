import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filtro di sicurezza per catturare e silenziare gli errori benigni del WebSocket di Vite (causati dall'HMR disabilitato nel container di anteprima)
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const msg = event?.message || "";
    if (
      msg.includes("WebSocket") || 
      msg.includes("vite") || 
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket closed without opened")
    ) {
      console.warn("[SILENCED VITE ERROR]", msg);
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg = reason?.message || String(reason || "");
    if (
      msg.includes("WebSocket") || 
      msg.includes("vite") || 
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket closed without opened")
    ) {
      console.warn("[SILENCED VITE REJECTION]", msg);
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
