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
import questionsRoute from './routes/questions';
import practiceRoute from './routes/practice';
import mistakesRoute from './routes/mistakes';
import revisionsRoute from './routes/revisions';
import notesRoute from './routes/notes';
import bookmarksRoute from './routes/bookmarks';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware — origin restricted via Cloudflare Dashboard or wrangler.toml
// For single-user Bearer-token auth, CORS origin is secondary security control.
// Set FRONTEND_URL in wrangler.toml to restrict in production.
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

// Protect all /api/* and /api/v1/* routes with Bearer authentication
app.use('/api/*', authMiddleware);
app.use('/api/v1/*', authMiddleware);

// Mount API route modules (v1 — versioned)
const apiV1 = app.basePath('/api/v1');

apiV1.route('/dashboard', dashboardRoute);
apiV1.route('/sessions', sessionsRoute);
apiV1.route('/goals', goalsRoute);
apiV1.route('/exams', examsRoute);
apiV1.route('', taxonomyRoute); // provides /api/v1/subjects and /api/v1/topics
apiV1.route('/taxonomy', taxonomyRoute); // provides /api/v1/taxonomy/subjects and /api/v1/taxonomy/topics
apiV1.route('/questions', questionsRoute);
apiV1.route('/practice', practiceRoute);
apiV1.route('/mistakes', mistakesRoute);
apiV1.route('/revisions', revisionsRoute);
apiV1.route('/notes', notesRoute);
apiV1.route('/bookmarks', bookmarksRoute);
apiV1.route('/backup', backupRoute);

// Mount API route modules (legacy /api/ — maintained for backward compatibility)
app.route('/api/dashboard', dashboardRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/goals', goalsRoute);
app.route('/api/exams', examsRoute);
app.route('/api', taxonomyRoute); // provides /api/subjects and /api/topics
app.route('/api/taxonomy', taxonomyRoute); // provides /api/taxonomy/subjects and /api/taxonomy/topics
app.route('/api/questions', questionsRoute);
app.route('/api/practice', practiceRoute);
app.route('/api/mistakes', mistakesRoute);
app.route('/api/revisions', revisionsRoute);
app.route('/api/notes', notesRoute);
app.route('/api/bookmarks', bookmarksRoute);
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
