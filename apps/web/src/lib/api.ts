import type { ReviewResponse, ReviewError } from './types';

const API_BASE = '/api';

export async function submitReview(code: string): Promise<ReviewResponse> {
  const response = await fetch(`${API_BASE}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const error: ReviewError = {
      message: errorBody?.message ?? `Request failed (${response.status})`,
      code: errorBody?.code ?? `HTTP_${response.status}`
    };
    throw error;
  }

  return response.json();
}
