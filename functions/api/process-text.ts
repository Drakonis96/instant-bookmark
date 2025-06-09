import type { PagesFunction, EventContext, Request as CfRequest } from '@cloudflare/workers-types';
import type { Env, LlmContentResponse } from '../types';
import { generateTitleAndSummaryForText } from '../services/llm-service';

export type { Env } from '../types';

interface ProcessTextRequest {
  text: string;
}

export async function handleProcessTextPost(
  request: CfRequest,
  env: Env
): Promise<Response> {
  try {
    const clientApiKey = request.headers.get('X-API-Key');
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      console.warn('[process-text] Unauthorized API access attempt');
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }

    if (request.headers.get('Content-Type') !== 'application/json') {
      return new Response('Invalid Content-Type. Expected application/json', { status: 415 });
    }

    let reqBody: ProcessTextRequest;
    try {
      reqBody = await request.json() as ProcessTextRequest;
    } catch {
      return new Response('Invalid JSON payload', { status: 400 });
    }

    if (!reqBody || typeof reqBody.text !== 'string' || !reqBody.text.trim()) {
      return new Response('Missing or invalid text in request body', { status: 400 });
    }

    const llmContent = await generateTitleAndSummaryForText(reqBody.text, env);
    const responseBody: LlmContentResponse = {
      title: llmContent.title,
      summary: llmContent.summary,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('[process-text] Error processing request:', error instanceof Error ? error.message : error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(errorMessage, { status: 500 });
  }
}

export const onRequestPost = (async (
  context: EventContext<Env, string, unknown>
) => {
  return handleProcessTextPost(context.request, context.env);
}) as unknown as PagesFunction<Env>;

export const onRequest = (async (
  context: EventContext<Env, string, unknown>
) => {
  const { request, env } = context;
  const clientApiKey = request.headers.get('X-API-Key');
  if (request.method !== 'POST') {
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      console.warn('[process-text] Unauthorized API access attempt to non-POST endpoint');
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }
    return new Response(`Method ${request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'POST' } });
  }
  return new Response('Please use POST method to process text.', { status: 405 });
}) as unknown as PagesFunction<Env>;
