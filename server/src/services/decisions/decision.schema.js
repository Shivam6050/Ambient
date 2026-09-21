const decisions = new Set(['NOTIFY', 'WAIT', 'IGNORE', 'ASK', 'ESCALATE']);
const priorities = new Set(['low', 'medium', 'high', 'critical']);
const targets = new Set(['ambient', 'alexa']);

export function validateProposal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid decision object');
  if (!decisions.has(value.decision)) throw new Error('Invalid decision');
  if (!priorities.has(value.priority)) throw new Error('Invalid priority');
  if (typeof value.reason !== 'string' || !value.reason.trim()) throw new Error('Decision reason is required');
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) throw new Error('Confidence must be between 0 and 1');
  if (typeof value.suggestedAction !== 'string' || !value.suggestedAction.trim()) throw new Error('Suggested action is required');
  if (!targets.has(value.target)) throw new Error('Invalid target');
  return { ...value, reason: value.reason.trim(), suggestedAction: value.suggestedAction.trim() };
}
