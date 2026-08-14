<script lang="ts">
  import CodeInput from '$lib/components/CodeInput.svelte';
  import ReviewResults from '$lib/components/ReviewResults.svelte';
  import { submitReview } from '$lib/api';
  import type { ReviewResponse, ReviewStatus, ReviewError } from '$lib/types';

  let code = $state('');
  let status = $state<ReviewStatus>('idle');
  let result = $state<ReviewResponse | null>(null);
  let error = $state<ReviewError | null>(null);

  const MAX_CODE_LENGTH = 20000;

  let isValid = $derived(code.trim().length > 0 && code.length <= MAX_CODE_LENGTH);
  let isDisabled = $derived(status === 'loading' || !isValid);

  async function handleReview() {
    if (!isValid) return;

    status = 'loading';
    error = null;
    result = null;

    try {
      result = await submitReview(code);
      status = 'success';
    } catch (e: any) {
      error = e as ReviewError;
      status = 'error';
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isDisabled) handleReview();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="container">
  <header class="header">
    <div class="header-content">
      <h1 class="title">Smart Code Reviewer</h1>
      <p class="subtitle">AI-assisted pre-review for developers</p>
    </div>
    <div class="header-line"></div>
  </header>

  <section class="input-section">
    <CodeInput bind:value={code} disabled={status === 'loading'} />

    {#if code.length > MAX_CODE_LENGTH}
      <p class="error-inline">
        Code exceeds {MAX_CODE_LENGTH.toLocaleString()} character limit ({code.length.toLocaleString()} characters)
      </p>
    {/if}

    <div class="actions">
      <button
        class="btn-review"
        disabled={isDisabled}
        onclick={handleReview}
      >
        {#if status === 'loading'}
          <span class="spinner"></span>
          <span>Reviewing...</span>
        {:else}
          <span>Review Code</span>
        {/if}
      </button>
      <span class="hint">or press Ctrl + Enter</span>
    </div>
  </section>

  {#if status === 'error' && error}
    <div class="error-banner" role="alert">
      <div class="error-icon">⚠</div>
      <div class="error-content">
        <span class="error-title">Something went wrong</span>
        <p class="error-message">{error.message}</p>
        {#if error.code}
          <span class="error-code">Error code: {error.code}</span>
        {/if}
      </div>
    </div>
  {/if}

  {#if status === 'success' && result}
    <section class="results-section">
      <ReviewResults {result} />
    </section>
  {/if}

  {#if status === 'idle' && !result}
    <section class="empty-state">
      <div class="empty-icon">◇</div>
      <p class="empty-text">
        Paste your code above and hit review to get instant feedback on readability, structure, and maintainability.
      </p>
    </section>
  {/if}
</main>

<style>
  .container {
    max-width: 780px;
    margin: 0 auto;
    padding: var(--space-2xl) var(--space-lg);
    width: 100%;
  }

  /* Header */
  .header {
    text-align: center;
    margin-bottom: var(--space-2xl);
  }

  .header-content {
    margin-bottom: var(--space-lg);
  }

  .title {
    font-family: var(--font-display);
    font-size: 2.4rem;
    color: var(--color-text);
    margin-bottom: var(--space-xs);
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-text-secondary);
    font-weight: 300;
  }

  .header-line {
    width: 50px;
    height: 2px;
    background: linear-gradient(90deg, var(--color-accent-light), var(--color-accent), var(--color-accent-light));
    margin: 0 auto;
    border-radius: 1px;
  }

  /* Input section */
  .input-section {
    margin-bottom: var(--space-xl);
  }

  .error-inline {
    margin-top: var(--space-sm);
    font-size: 0.82rem;
    color: var(--color-terracotta);
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }

  .btn-review {
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.75rem 2.2rem;
    color: #fff;
    background: var(--color-accent);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    box-shadow: 0 2px 8px rgba(139, 94, 60, 0.25);
  }

  .btn-review:hover:not(:disabled) {
    background: var(--color-accent-hover);
    box-shadow: 0 4px 14px rgba(139, 94, 60, 0.35);
    transform: translateY(-1px);
  }

  .btn-review:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-review:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  /* Error banner */
  .error-banner {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--color-terracotta-light);
    border: 1px solid rgba(184, 92, 72, 0.2);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xl);
    animation: fadeSlideUp 0.3s ease;
  }

  .error-icon {
    font-size: 1.2rem;
    color: var(--color-terracotta);
    line-height: 1;
    margin-top: 2px;
  }

  .error-title {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-terracotta);
    margin-bottom: 2px;
  }

  .error-message {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  .error-code {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin-top: var(--space-xs);
  }

  /* Results */
  .results-section {
    margin-top: var(--space-xl);
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    animation: fadeIn 0.6s ease;
  }

  .empty-icon {
    font-size: 2rem;
    color: var(--color-border);
    margin-bottom: var(--space-md);
  }

  .empty-text {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    max-width: 360px;
    margin: 0 auto;
    line-height: 1.6;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: 640px) {
    .container {
      padding: var(--space-xl) var(--space-md);
    }

    .title {
      font-size: 1.8rem;
    }

    .subtitle {
      font-size: 0.9rem;
    }

    .actions {
      flex-direction: column;
    }

    .hint {
      display: none;
    }
  }
</style>
