import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  createFlowSchema,
  createWorkItemSchema,
  organizationContextSchema,
} from '../../../packages/contracts/src/index.js';

export type TenantContext = ReturnType<typeof organizationContextSchema.parse>;
export type TenantContextResolver = (req: Request) => TenantContext;

export function headerTenantContext(req: Request): TenantContext {
  return organizationContextSchema.parse({
    organizationId: req.header('x-casioplus-organization-id'),
    workspaceId: req.header('x-casioplus-workspace-id'),
    actorId: req.header('x-casioplus-actor-id'),
  });
}

function requestId(req: Request): string {
  return req.header('x-correlation-id') ?? randomUUID();
}

export interface AppOptions {
  resolveTenantContext?: TenantContextResolver;
}

export function createApp(pool: Pool, options: AppOptions = {}) {
  const resolveTenantContext = options.resolveTenantContext ?? headerTenantContext;
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '256kb' }));

  app.get('/healthz', async (_req, res, next) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', service: 'core-api', database: 'ready' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/work-items', async (req, res, next) => {
    try {
      const context = resolveTenantContext(req);
      const result = await pool.query(
        `SELECT id, organization_id AS "organizationId", workspace_id AS "workspaceId", title, intent,
                status, created_by_actor_id AS "createdByActorId", created_at AS "createdAt", updated_at AS "updatedAt"
           FROM work_items
          WHERE organization_id = $1 AND workspace_id = $2
          ORDER BY created_at DESC
          LIMIT 100`,
        [context.organizationId, context.workspaceId],
      );
      res.json({ items: result.rows, requestId: requestId(req) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/work-items', async (req, res, next) => {
    try {
      const context = resolveTenantContext(req);
      const input = createWorkItemSchema.parse({ ...req.body, ...context });
      const row = await pool.query(
        `INSERT INTO work_items (organization_id, workspace_id, title, intent, created_by_actor_id)
         SELECT $1, $2, $3, $4, $5
          WHERE EXISTS (
            SELECT 1 FROM workspaces
             WHERE id = $2 AND organization_id = $1
          )
            AND EXISTS (
            SELECT 1 FROM actors
             WHERE id = $5 AND organization_id = $1
               AND (workspace_id IS NULL OR workspace_id = $2)
          )
         RETURNING id, organization_id AS "organizationId", workspace_id AS "workspaceId", title, intent,
                   status, created_by_actor_id AS "createdByActorId", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [input.organizationId, input.workspaceId, input.title, input.intent ?? null, input.actorId],
      );
      if (row.rowCount !== 1) {
        return res.status(403).json({
          error: 'tenant_context_not_authorized',
          requestId: requestId(req),
        });
      }
      return res.status(201).json(row.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/flows', async (req, res, next) => {
    try {
      const context = resolveTenantContext(req);
      const result = await pool.query(
        `SELECT id, organization_id AS "organizationId", workspace_id AS "workspaceId", key, name, status,
                active_version_id AS "activeVersionId"
           FROM flows
          WHERE organization_id = $1 AND workspace_id = $2
          ORDER BY updated_at DESC
          LIMIT 100`,
        [context.organizationId, context.workspaceId],
      );
      res.json({ flows: result.rows, requestId: requestId(req) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/flows', async (req, res, next) => {
    try {
      const context = resolveTenantContext(req);
      const input = createFlowSchema.parse({ ...req.body, ...context });
      const row = await pool.query(
        `INSERT INTO flows (organization_id, workspace_id, key, name, created_by_actor_id)
         SELECT $1, $2, $3, $4, $5
          WHERE EXISTS (
            SELECT 1 FROM workspaces
             WHERE id = $2 AND organization_id = $1
          )
            AND EXISTS (
            SELECT 1 FROM actors
             WHERE id = $5 AND organization_id = $1
               AND (workspace_id IS NULL OR workspace_id = $2)
          )
         RETURNING id, organization_id AS "organizationId", workspace_id AS "workspaceId", key, name, status,
                   active_version_id AS "activeVersionId"`,
        [input.organizationId, input.workspaceId, input.key, input.name, input.actorId],
      );
      if (row.rowCount !== 1) {
        return res.status(403).json({
          error: 'tenant_context_not_authorized',
          requestId: requestId(req),
        });
      }
      return res.status(201).json(row.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestIdValue = requestId(req);
    if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number') {
      const code =
        'code' in error && typeof error.code === 'string' ? error.code : 'request_failed';
      return res.status(error.statusCode).json({ error: code, requestId: requestIdValue });
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'invalid_request',
        requestId: requestIdValue,
      });
    }
    console.error(JSON.stringify({ level: 'error', requestId: requestIdValue, error }));
    return res.status(500).json({
      error: 'internal_error',
      requestId: requestIdValue,
    });
  });

  return app;
}
