import type { MiddlewareHandler } from 'hono';
import type { ApiResponse } from '@study-buddy/shared';
import type { Env } from '../types';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // Skip preflight OPTIONS requests
  if (c.req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header',
      },
      401
    );
  }

  const token = authHeader.substring(7).trim();
  const expectedToken = c.env.API_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: 'Unauthorized: Invalid token',
      },
      401
    );
  }

  await next();
};
