import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root')!;
const hasWebGL2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();

createRoot(root).render(
  <StrictMode>
    {hasWebGL2 ? <App /> : (
      <div className="welcome" style={{ position: 'fixed' }}>
        <h3>Your browser can't draw the map</h3>
        <p>CompareRange needs WebGL 2. Try a current Chrome, Firefox, Safari or Edge, and check that hardware acceleration is on.</p>
      </div>
    )}
  </StrictMode>,
);
