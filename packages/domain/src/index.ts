export type Identifier = string;

export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer' | 'consumer';

export type FlowStatus = 'draft' | 'validated' | 'published' | 'archived' | 'retired';

export type ProcessRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type WorkItemStatus = 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export interface Actor {
  id: Identifier;
  organizationId: Identifier;
  workspaceId: Identifier | null;
  kind: 'human' | 'agent' | 'runtime';
  displayName: string;
}

export interface WorkItem {
  id: Identifier;
  organizationId: Identifier;
  workspaceId: Identifier;
  title: string;
  intent: string | null;
  status: WorkItemStatus;
  createdByActorId: Identifier;
  createdAt: string;
  updatedAt: string;
}

export interface FlowDefinition {
  id: Identifier;
  organizationId: Identifier;
  workspaceId: Identifier;
  key: string;
  name: string;
  status: FlowStatus;
  activeVersionId: Identifier | null;
}

export interface FlowVersion {
  id: Identifier;
  flowId: Identifier;
  version: number;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  runtimeBinding: 'native' | 'n8n' | 'openclaw' | 'open-webui';
  createdAt: string;
}

export interface ProcessRun {
  id: Identifier;
  organizationId: Identifier;
  workspaceId: Identifier;
  workItemId: Identifier;
  flowId: Identifier;
  flowVersionId: Identifier;
  status: ProcessRunStatus;
  idempotencyKey: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkCommit {
  id: Identifier;
  organizationId: Identifier;
  workspaceId: Identifier;
  workItemId: Identifier;
  processRunId: Identifier;
  title: string;
  summary: string;
  outcome: Record<string, unknown>;
  status: 'pending_review' | 'approved' | 'rejected' | 'superseded';
  createdAt: string;
}

export interface Provenance {
  sourceType: 'process_run' | 'artifact' | 'human_input' | 'external_reference';
  sourceId: Identifier;
  actorId: Identifier | null;
  capturedAt: string;
}
