import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Studio from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
