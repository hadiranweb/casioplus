import { runtimeEventSchema } from '../../../packages/contracts/src/index.js';

export interface DiagnosisInput {
  organizationId: string;
  workspaceId: string;
  actorId: string;
  processRunId: string;
  answers: Record<string, unknown>;
}

export interface DiagnosisOutput {
  summary: string;
  dimensions: Record<string, number>;
  findings: Array<{ key: string; value: string; confidence: number }>;
}

export function diagnose(input: DiagnosisInput): DiagnosisOutput {
  const answerCount = Object.keys(input.answers).length;
  const completeness = Math.min(1, answerCount / 5);
  return {
    summary: 'Business diagnosis completed from the submitted structured answers.',
    dimensions: {
      capability: Number((0.5 + completeness * 0.5).toFixed(3)),
      workStyle: Number((0.45 + completeness * 0.45).toFixed(3)),
      motivation: Number((0.4 + completeness * 0.5).toFixed(3)),
      constraintCompatibility: Number((0.35 + completeness * 0.55).toFixed(3)),
    },
    findings: [
      {
        key: 'input_completeness',
        value: `${answerCount} structured answer(s) received`,
        confidence: Number(completeness.toFixed(3)),
      },
    ],
  };
}

export function buildCompletedEvent(input: DiagnosisInput, output: DiagnosisOutput) {
  return runtimeEventSchema.parse({
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    processRunId: input.processRunId,
    type: 'diagnosis.completed',
    payload: output,
  });
}
