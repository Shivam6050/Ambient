import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { env } from '../../config/env.js';

let client;
function getClient() { if (!client) client = new BedrockRuntimeClient({ region: env.awsRegion, maxAttempts: 1 }); return client; }

export async function generateAmbientInsight({ event, context, decision }) {
  if (!env.awsBedrockEnabled) return { enabled: false, provider: 'aws-bedrock', model: env.bedrockModelId, text: 'AWS Bedrock is disabled. Set AWS_BEDROCK_ENABLED=true to request an AWS-backed explanation.' };
  const prompt = `Explain why Ambient took this already-decided action in exactly two short sentences. Do not make a new decision or change policy.\nEvent: ${JSON.stringify(event)}\nContext: ${JSON.stringify(context)}\nDecision: ${decision.decision}\nPriority: ${decision.priority}\nConfidence: ${decision.confidence}\nGate: ${decision.gate?.mode || 'AUTO'}`;
  const response = await getClient().send(new ConverseCommand({
    modelId: env.bedrockModelId,
    system: [{ text: 'You are Ambient\'s explanation layer. Explain a decision; never make or modify decisions.' }],
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 120, temperature: 0.2 }
  }));
  const text = response.output?.message?.content?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Amazon Bedrock returned an empty insight');
  return { enabled: true, provider: 'aws-bedrock', model: env.bedrockModelId, region: env.awsRegion, text, usage: response.usage || null };
}
