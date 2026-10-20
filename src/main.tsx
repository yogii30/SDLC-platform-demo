import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { LoginPage } from './LoginPage.js';

// The login page is the application's only screen, so it is mounted as the root
// directly; there is no router.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
);
