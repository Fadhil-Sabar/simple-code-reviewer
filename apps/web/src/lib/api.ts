import type { ReviewResponse, ReviewError } from './types';

const API_BASE = '/api';

interface ApiErrorResponse {
  error?: {
    message?: unknown;
    type?: unknown;
  };
}

function errorBody(body: unknown, status: number): ReviewError {
  const apiError = (body as ApiErrorResponse | null)?.error;

  return {
    message:
      typeof apiError?.message === 'string'
        ? apiError.message
        : `Request failed (${status})`,
    code: typeof apiError?.type === 'string' ? apiError.type : `HTTP_${status}`
  };
}

export async function submitReview(code: string): Promise<ReviewResponse> {
  const response = await fetch(`${API_BASE}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const responseError = await response.json().catch(() => null);
    throw errorBody(responseError, response.status);
  }

  return response.json();
}
