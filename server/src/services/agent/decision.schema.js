const decisions = ['NOTIFY', 'WAIT', 'IGNORE', 'ASK', 'ESCALATE'];
const priorities = ['low', 'medium', 'high', 'critical'];

export function validateProposal(value) {
  if (!value || !decisions.includes(value.decision)) throw new Error('Invalid agent decision');
  if (!priorities.includes(value.priority)) throw new Error('Invalid decision priority');
  if (typeof value.reason !== 'string' || !value.reason.trim()) throw new Error('Decision reason is required');
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) throw new Error('Confidence must be between 0 and 1');
  if (typeof value.suggestedAction !== 'string' || !value.suggestedAction.trim()) throw new Error('Suggested action is required');
  return value;
}
