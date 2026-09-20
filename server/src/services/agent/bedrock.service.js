import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { env } from '../../config/env.js';

let client;
function getClient() {
  if (!client) client = new BedrockRuntimeClient({ region: env.awsRegion });
  return client;
}

function buildPrompt({ event, context, decision }) {
  return `Create a concise, user-friendly explanation of why Ambient chose this action.
Do not make a new decision. Do not override Jev or policy.
Return exactly 2 short sentences.

Event: ${JSON.stringify(event)}
Current context: ${JSON.stringify(context)}
Ambient decision: ${decision.decision}
Urgency: ${decision.priority}
Confidence: ${decision.confidence}
Gate: ${decision.gate?.mode || 'AUTO'}
Suggested action: ${decision.suggestedAction}`;
}

export async function generateAmbientInsight(input) {
  if (!env.awsEnabled) {
    return { enabled: false, provider: 'aws-bedrock', model: env.bedrockModelId, text: 'AWS Bedrock is disabled. Enable AWS_BEDROCK_ENABLED=true to generate an AWS-backed insight.' };
  }
  const command = new ConverseCommand({
    modelId: env.bedrockModelId,
    system: [{ text: 'You are the explanation layer for Ambient. Explain decisions; never make or change decisions.' }],
    messages: [{ role: 'user', content: [{ text: buildPrompt(input) }] }],
    inferenceConfig: { maxTokens: 120, temperature: 0.2 }
  });
  const response = await getClient().send(command);
  const text = response.output?.message?.content?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Amazon Bedrock returned an empty insight');
  return { enabled: true, provider: 'aws-bedrock', model: env.bedrockModelId, region: env.awsRegion, text, usage: response.usage || null };
}
