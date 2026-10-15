import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ApiResponse } from '@study-buddy/shared';
import type { Env } from './types';
import { authMiddleware } from './middleware/auth';
import dashboardRoute from './routes/dashboard';
import sessionsRoute from './routes/sessions';
import goalsRoute from './routes/goals';
import examsRoute from './routes/exams';
import taxonomyRoute from './routes/taxonomy';
import backupRoute from './routes/backup';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Public health check routes
app.get('/', (c) => {
  return c.json({
    name: 'Study Buddy API',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Protect all /api/* routes with Bearer authentication
app.use('/api/*', authMiddleware);

// Mount API route modules
app.route('/api/dashboard', dashboardRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/goals', goalsRoute);
app.route('/api/exams', examsRoute);
app.route('/api', taxonomyRoute); // provides /api/subjects and /api/topics
app.route('/api/taxonomy', taxonomyRoute); // provides /api/taxonomy/subjects and /api/taxonomy/topics
app.route('/api/backup', backupRoute);

// 404 Not Found Handler
app.notFound((c) => {
  return c.json<ApiResponse<never>>(
    {
      success: false,
      error: `Route not found: ${c.req.method} ${c.req.path}`,
    },
    404
  );
});

// Global Error Handler
app.onError((err, c) => {
  console.error('Unhandled API Error:', err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return c.json<ApiResponse<never>>(
    {
      success: false,
      error: message,
    },
    500
  );
});

export default app;
