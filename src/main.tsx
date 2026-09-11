import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Global API Interceptor ───────────────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.startsWith('/api/') || url.includes('/api/')) {
    const token = localStorage.getItem('hf_token');
    const newInit = { ...init };
    if (token) {
      const headers = new Headers(newInit.headers);
      headers.set('Authorization', `Bearer ${token}`);
      newInit.headers = headers;
    }
    const res = await originalFetch(input, newInit);
    if (res.status === 401) {
      localStorage.removeItem('hf_token');
      window.dispatchEvent(new CustomEvent('hf_unauthorized'));
    }
    return res;
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(

  <App />

)
