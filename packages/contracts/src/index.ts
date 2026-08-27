import { z } from 'zod';

export const identifierSchema = z.string().uuid();

export const organizationContextSchema = z.object({
  organizationId: identifierSchema,
  workspaceId: identifierSchema,
  actorId: identifierSchema,
});

export const createWorkItemSchema = organizationContextSchema.extend({
  title: z.string().trim().min(1).max(200),
  intent: z.string().trim().max(2000).nullable().optional(),
});

export const createFlowSchema = organizationContextSchema.extend({
  key: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  name: z.string().trim().min(1).max(200),
});

export const createFlowVersionSchema = z.object({
  flowId: identifierSchema,
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  runtimeBinding: z.enum(['native', 'n8n', 'openclaw', 'open-webui']),
});

export const createProcessRunSchema = organizationContextSchema.extend({
  workItemId: identifierSchema,
  flowId: identifierSchema,
  flowVersionId: identifierSchema,
  idempotencyKey: z.string().trim().min(16).max(200),
  input: z.record(z.string(), z.unknown()),
});

export const runtimeEventSchema = organizationContextSchema.extend({
  processRunId: identifierSchema.nullable(),
  type: z.string().regex(/^[a-z][a-z0-9_.-]{1,127}$/),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.string().datetime().optional(),
});

export const createCommitSchema = organizationContextSchema.extend({
  workItemId: identifierSchema,
  processRunId: identifierSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(5000),
  outcome: z.record(z.string(), z.unknown()),
});

export const reviewDecisionSchema = z.object({
  organizationId: identifierSchema,
  workspaceId: identifierSchema,
  actorId: identifierSchema,
  decision: z.enum(['approve', 'reject', 'correct', 'supersede']),
  rationale: z.string().trim().min(1).max(5000),
});

export const governedRetrievalSchema = organizationContextSchema.extend({
  query: z.string().trim().min(1).max(1000),
  allowedKinds: z
    .array(
      z.enum(['verified_fact', 'operational_procedure', 'governed_decision', 'validated_pattern']),
    )
    .optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;
export type CreateFlowInput = z.infer<typeof createFlowSchema>;
export type CreateFlowVersionInput = z.infer<typeof createFlowVersionSchema>;
export type CreateProcessRunInput = z.infer<typeof createProcessRunSchema>;
export type RuntimeEventInput = z.infer<typeof runtimeEventSchema>;
export type CreateCommitInput = z.infer<typeof createCommitSchema>;
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
export type GovernedRetrievalInput = z.infer<typeof governedRetrievalSchema>;
