import { env } from '../../config/env.js';

const DECISIONS = ['NOTIFY', 'WAIT', 'IGNORE', 'ASK', 'ESCALATE'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function buildState({ event, context, preferences }) {
  return {
    event,
    user_context: context,
    preferences,
    system: {
      available_decisions: DECISIONS,
      available_priorities: PRIORITIES,
      instruction: 'Choose what Ambient should do next. Do not invent actions outside the provided decision space.'
    }
  };
}

function buildQuestions() {
  return {
    decision: {
      type: 'choice',
      instructions: 'What should Ambient do with this event right now?',
      criteria: {
        NOTIFY: 'Notify or surface the event to the user now.',
        WAIT: 'Defer the event and reconsider it when the user becomes available or context changes.',
        IGNORE: 'Take no action because the event is not useful or relevant.',
        ASK: 'Ask the user for clarification before taking action.',
        ESCALATE: 'Escalate because the event requires a stronger or external response.'
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

function probability(answer) {
  return typeof answer?.confidence === 'number'
    ? answer.confidence
    : Math.max(...Object.values(answer?.probabilities || {}).map(Number), 0);
}

function toDecisionResponse(answers) {
  const decisionAnswer = answers.decision;
  const priorityAnswer = answers.priority;
  const interruptProbability = Number(answers.should_interrupt?.noul ?? 0);
  const decision = decisionAnswer.choice;
  const priorityScore = Number(priorityAnswer.score ?? 1);
  const priorityIndex = Math.max(0, Math.min(3, Math.round(priorityScore)));
  const priority = PRIORITIES[priorityIndex];
  const confidence = Math.min(
    probability(decisionAnswer),
    probability(priorityAnswer),
    decision === 'NOTIFY' ? Math.max(interruptProbability, 1 - interruptProbability) : 1
  );

  return {
    decision,
    priority,
    confidence,
    interruptProbability,
    probabilities: {
      decision: decisionAnswer.probabilities || {},
      priority: priorityAnswer.probabilities || {},
      priorityScore
    },
    source: 'jev'
  };
}

export async function evaluateWithJev(input) {
  if (!env.typesafeApiKey) {
    throw new Error('TYPESAFE_API_KEY is required when AI_PROVIDER=jev');
  }

  const response = await fetch(env.jevBaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.typesafeApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.jevModel,
      state: buildState(input),
      questions: buildQuestions()
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Jev API failed (${response.status}): ${body?.error?.message || body?.message || 'Unknown error'}`);
  }
  if (!body.answers?.decision || !body.answers?.priority || !body.answers?.should_interrupt) {
    throw new Error('Jev returned an incomplete decision response');
  }

  return {
    ...toDecisionResponse(body.answers),
    model: body.model || env.jevModel,
    usage: body.usage || null
  };
}
