<script lang="ts">
  import type { ReviewResponse, ReviewCategory } from '$lib/types';
  import ScoreRing from './ScoreRing.svelte';
  import CategoryCard from './CategoryCard.svelte';

  interface Props {
    result: ReviewResponse;
  }

  let { result }: Props = $props();

  const categories: ReviewCategory[] = ['readability', 'structure', 'maintainability'];
</script>

<div class="results" style="--stagger: 0">
  <div class="results-header">
    <ScoreRing score={result.score} />
    <div class="results-summary">
      <h2 class="results-title">Review Complete</h2>
      <p class="results-subtitle">
        {#if result.score >= 8}
          Your code looks solid. A few minor refinements could make it even better.
        {:else if result.score >= 5}
          Decent foundation. Addressing the suggestions below will improve code quality.
        {:else}
          There are several areas to improve. Focus on the issues listed below.
        {/if}
      </p>
    </div>
  </div>

  <div class="results-grid">
    {#each categories as cat, i}
      <div style="animation-delay: {i * 80}ms" class="grid-item">
        <CategoryCard category={cat} issues={result[cat]} />
      </div>
    {/each}
  </div>

  {#if result.positiveNote}
    <div class="positive-note">
      <div class="note-icon">✦</div>
      <div class="note-content">
        <span class="note-label">Positive note</span>
        <p class="note-text">{result.positiveNote}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .results {
    animation: fadeIn 0.5s ease;
  }

  .results-header {
    display: flex;
    align-items: center;
    gap: var(--space-xl);
    margin-bottom: var(--space-xl);
    padding: var(--space-xl);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .results-summary {
    flex: 1;
  }

  .results-title {
    font-family: var(--font-display);
    font-size: 1.6rem;
    color: var(--color-text);
    margin-bottom: var(--space-xs);
  }

  .results-subtitle {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .grid-item {
    animation: fadeSlideUp 0.4s ease both;
  }

  .positive-note {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--color-sage-light);
    border: 1px solid rgba(107, 124, 94, 0.15);
    border-radius: var(--radius-md);
    animation: fadeSlideUp 0.5s ease 0.3s both;
  }

  .note-icon {
    font-size: 1.2rem;
    color: var(--color-sage);
    line-height: 1;
    margin-top: 2px;
  }

  .note-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-sage);
    margin-bottom: var(--space-xs);
  }

  .note-text {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--color-text);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .results-header {
      flex-direction: column;
      text-align: center;
      gap: var(--space-md);
    }

    .results-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
