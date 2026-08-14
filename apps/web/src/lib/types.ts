export interface ReviewIssue {
  issue: string;
  suggestion: string;
}

export interface ReviewResponse {
  score: number;
  readability: ReviewIssue[];
  structure: ReviewIssue[];
  maintainability: ReviewIssue[];
  positiveNote: string;
}

export type ReviewCategory = 'readability' | 'structure' | 'maintainability';

export type ReviewStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ReviewError {
  message: string;
  code?: string;
}
