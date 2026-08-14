/** Shared domain types for the Smart Code Reviewer backend. */

export interface ReviewIssue {
  /** Short description of the problem found. */
  issue: string;
  /** Concrete, actionable recommendation. */
  suggestion: string;
}

export interface CodeReview {
  /** Overall score from 0 to 10. */
  score: number;
  /** Readability findings (naming, clarity, complexity). */
  readability: ReviewIssue[];
  /** Structure findings (responsibilities, separation of concerns, duplication). */
  structure: ReviewIssue[];
  /** Maintainability findings (coupling, repeated logic, error handling). */
  maintainability: ReviewIssue[];
  /** At least one positive note is always present. */
  positiveNote: string;
}

/** Payload accepted by POST /api/review. */
export interface ReviewRequest {
  code: string;
}
