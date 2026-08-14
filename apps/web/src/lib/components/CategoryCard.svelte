<script lang="ts">
  import type { ReviewCategory } from '$lib/types';
  import type { ReviewIssue } from '$lib/types';

  interface Props {
    category: ReviewCategory;
    issues: ReviewIssue[];
  }

  let { category, issues }: Props = $props();

  const categoryMeta: Record<ReviewCategory, { label: string; icon: string; colorVar: string }> = {
    readability: {
      label: 'Readability',
      icon: '◎',
      colorVar: 'var(--color-clay)'
    },
    structure: {
      label: 'Structure',
      icon: '▣',
      colorVar: 'var(--color-sage)'
    },
    maintainability: {
      label: 'Maintainability',
      icon: '◈',
      colorVar: 'var(--color-accent)'
    }
  };

  let meta = $derived(categoryMeta[category]);
</script>

<div class="category-card" style="--card-accent: {meta.colorVar}">
  <div class="card-header">
    <span class="card-icon">{meta.icon}</span>
    <h3 class="card-title">{meta.label}</h3>
    <span class="card-count">{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</span>
  </div>

  {#if issues.length === 0}
    <div class="card-empty">
      <span class="empty-check">✓</span>
      <span>No issues found</span>
    </div>
  {:else}
    <ul class="issue-list">
      {#each issues as item, i}
        <li class="issue-item" style="animation-delay: {i * 60}ms">
          <div class="issue-main">
            <span class="issue-bullet">›</span>
            <span class="issue-text">{item.issue}</span>
          </div>
          {#if item.suggestion}
            <p class="issue-suggestion">{item.suggestion}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .category-card {
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .category-card:hover {
    border-color: var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .card-icon {
    font-size: 1.1rem;
    color: var(--card-accent);
    line-height: 1;
  }

  .card-title {
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.02em;
    flex: 1;
  }

  .card-count {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
    background: var(--color-surface);
    padding: 2px 8px;
    border-radius: 999px;
  }

  .card-empty {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) 0;
    color: var(--color-sage);
    font-size: 0.85rem;
  }

  .empty-check {
    font-size: 1rem;
  }

  .issue-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .issue-item {
    animation: fadeSlideIn 0.3s ease both;
  }

  .issue-main {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .issue-bullet {
    color: var(--card-accent);
    font-weight: 600;
    line-height: 1.5;
    flex-shrink: 0;
  }

  .issue-text {
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--color-text);
  }

  .issue-suggestion {
    margin-top: var(--space-xs);
    padding-left: calc(0.7rem + var(--space-sm));
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
