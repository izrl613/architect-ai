import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UIDesignProvider } from './UIDesignContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIDesignProvider>
      <App />
    </UIDesignProvider>
  </StrictMode>,
);
