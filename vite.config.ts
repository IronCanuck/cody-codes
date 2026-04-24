import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Root-absolute assets so client routes like /consaltyapp (no trailing slash) do not
  // mis-resolve ./assets/... to /assets/ at the wrong path (HTML 404 → MIME error).
  base: '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
