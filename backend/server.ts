import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import salesRoutes from './routes/sales.routes';
import tablesRoutes from './routes/tables.routes';
import kotRoutes from './routes/kot.routes';
import businessRoutes from './routes/business.routes';
import healthRoutes from './routes/health.routes';
import supabaseRoutes from './routes/supabase.routes';

export const backendApp: Express = express();

// Global Middlewares
backendApp.use(cors());
backendApp.use(express.json({ limit: '10mb' }));
backendApp.use(express.urlencoded({ extended: true }));

// Request logging for dev & diagnostics
backendApp.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.log(`[REST API] ${req.method} ${req.path}`);
  }
  next();
});

// Mount API Routers
backendApp.use('/api/health', healthRoutes);
backendApp.use('/api/auth', authRoutes);
backendApp.use('/api/products', productsRoutes);
backendApp.use('/api/sales', salesRoutes);
backendApp.use('/api/tables', tablesRoutes);
backendApp.use('/api/kot', kotRoutes);
backendApp.use('/api/business', businessRoutes);
backendApp.use('/api/supabase', supabaseRoutes);

// Catch-all 404 for unhandled API paths
backendApp.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
  }
  next();
});

// Error handling middleware
backendApp.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[REST API Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Standalone runner function
export function startServer(port: number = 5000) {
  backendApp.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Aura Cafe REST API server listening at http://localhost:${port}`);
  });
}

// Auto-run if executed as entrypoint
if (import.meta.url.endsWith(process.argv[1]) || process.env.RUN_STANDALONE === 'true') {
  startServer(Number(process.env.PORT) || 5000);
}
