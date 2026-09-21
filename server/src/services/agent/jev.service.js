import { env } from '../../config/env.js';

const DECISIONS = ['NOTIFY', 'WAIT', 'IGNORE', 'ASK', 'ESCALATE'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function state({ event, context, preferences }) {
  return {
    event: {
      source: event.source,
      type: event.type,
      priority: event.priority,
      metadata: { temperatureSensitive: event.metadata?.temperatureSensitive === true }
    },
    user_context: { availability: context.availability, activity: context.activity, location: context.location },
    preferences,
    system: { available_decisions: DECISIONS, available_priorities: PRIORITIES }
  };
}

function questions() {
  return {
    decision: {
      type: 'choice',
      instructions: 'What should Ambient do with this event right now?',
      criteria: {
        NOTIFY: 'Notify the user now.',
        WAIT: 'Defer and reconsider when context changes.',
        IGNORE: 'Take no action.',
        ASK: 'Ask the user for clarification.',
        ESCALATE: 'Escalate because a stronger response is required.'
      }
    },
    priority: {
      type: 'score',
      instructions: 'How urgent is this event right now?',
      criteria: [
        'Low urgency; it can safely wait.',
        'Medium urgency; useful but not time-critical.',
        'High urgency; it should receive attention soon.',
        'Critical urgency; delay could create meaningful harm or loss.'
      ]
    },
    should_interrupt: {
      type: 'noul',
      instructions: 'Should Ambient interrupt the user immediately given the event and current context?'
    }
  };
}

const confidenceFrom = (answer) => typeof answer?.confidence === 'number'
  ? answer.confidence
  : Math.max(...Object.values(answer?.probabilities || {}).map(Number), 0);

export function normalizeJevAnswers(answers, model) {
  const decisionAnswer = answers.decision;
  const priorityAnswer = answers.priority;
  const interruptProbability = Number(answers.should_interrupt?.noul ?? 0);
  const decision = decisionAnswer.choice;
  const priorityScore = Number(priorityAnswer.score ?? 1);
  const priorityIndex = Math.max(0, Math.min(3, Math.round(priorityScore)));
  const priority = PRIORITIES[priorityIndex];
  const interruptCertainty = Math.max(interruptProbability, 1 - interruptProbability);
  const confidence = Math.min(
    confidenceFrom(decisionAnswer),
    confidenceFrom(priorityAnswer),
    decision === 'NOTIFY' ? interruptCertainty : 1
  );

  return {
    decision,
    priority,
    priorityScore,
    confidence,
    reason: `Jev selected ${decision} with ${Math.round(confidence * 100)}% combined decision certainty.`,
    suggestedAction: decision === 'WAIT' ? 'Store the event and re-evaluate when context changes.' : 'Notify or route the event according to policy.',
    target: decision === 'NOTIFY' ? 'alexa' : 'ambient',
    source: 'jev',
    model,
    jev: {
      model,
      interruptProbability,
      probabilities: {
        decision: decisionAnswer.probabilities || {},
        priority: priorityAnswer.probabilities || {}
      }
    }
  };
}

export async function evaluateWithJev(input) {
  if (!env.typesafeApiKey) throw new Error('TYPESAFE_API_KEY is required when AI_PROVIDER=jev');
  const response = await fetch(env.jevBaseUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.typesafeApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.jevModel, state: state(input), questions: questions() })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Jev API failed (${response.status}): ${body?.error?.message || body?.message || 'Unknown error'}`);
  if (!body.answers?.decision || !body.answers?.priority || !body.answers?.should_interrupt) throw new Error('Jev returned an incomplete response');
  return normalizeJevAnswers(body.answers, body.model || env.jevModel);
}
