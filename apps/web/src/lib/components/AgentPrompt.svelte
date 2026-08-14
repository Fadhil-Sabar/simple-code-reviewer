<script lang="ts">
  import type { ReviewCategory, ReviewResponse } from '$lib/types';

  interface Props {
    result: ReviewResponse;
  }

  interface PromptFinding {
    category: string;
    issue: string;
    suggestion: string;
  }

  let { result }: Props = $props();
  let isExpanded = $state(false);
  let copied = $state(false);
  let copyFailed = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const categoryLabels: Record<ReviewCategory, string> = {
    readability: 'Readability',
    structure: 'Structure',
    maintainability: 'Maintainability'
  };

  let findings = $derived(
    (Object.keys(categoryLabels) as ReviewCategory[]).flatMap((category) =>
      result[category].map((finding) => ({
        category: categoryLabels[category],
        issue: finding.issue,
        suggestion: finding.suggestion
      }))
    )
  );

  let prompt = $derived(buildPrompt(findings));

  function buildPrompt(items: PromptFinding[]): string {
    const findingsText = items.length
      ? items
          .map(
            (item, index) =>
              `${index + 1}. [${item.category}] ${item.issue}${item.suggestion ? `\n   Suggested approach: ${item.suggestion}` : ''}`
          )
          .join('\n')
      : 'No specific issues were identified. Validate the current implementation and look for small, low-risk improvements.';

    return `Act as a senior software engineer. Review the code in this repository and address the findings below.

For each finding:
- Inspect the surrounding code and confirm the best fix.
- Implement the smallest safe change that resolves the underlying problem.
- Preserve existing behavior and project conventions.
- Add or update tests when appropriate.
- Summarize what changed and call out anything that still needs attention.

Review findings:
${findingsText}`;
  }

  async function copyPrompt() {
    copyFailed = false;

    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copied = false;
      }, 2200);
    } catch {
      copyFailed = true;
      copied = false;
    }
  }
</script>

<section class="prompt-card" aria-labelledby="agent-prompt-title">
  <div class="prompt-header">
    <div class="prompt-heading">
      <span class="prompt-icon" aria-hidden="true">✦</span>
      <div>
        <span class="prompt-eyebrow">Ready for your next step</span>
        <h3 id="agent-prompt-title" class="prompt-title">Ask an AI agent to fix this</h3>
      </div>
    </div>
    <div class="prompt-actions">
      <button
        class="copy-button"
        type="button"
        onclick={copyPrompt}
        aria-label={copied ? 'Prompt copied' : 'Copy prompt'}
      >
        <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
        <span>{copied ? 'Copied' : 'Copy prompt'}</span>
      </button>
      <button
        class="toggle-button"
        type="button"
        aria-expanded={isExpanded}
        aria-controls="agent-prompt-content"
        aria-label={isExpanded ? 'Hide prompt' : 'Show prompt'}
        onclick={() => (isExpanded = !isExpanded)}
      >
        {#if isExpanded}
          <svg
            class="chevron"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        {:else}
          <svg
            class="chevron"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        {/if}
      </button>
      <span class="copy-feedback" role="status" aria-live="polite">
        {#if copied}
          Prompt copied to your clipboard.
        {:else if copyFailed}
          Copy was blocked. Select the prompt and copy it manually.
        {/if}
      </span>
    </div>
  </div>

  {#if isExpanded}
    <div id="agent-prompt-content" class="prompt-content">
      <p class="prompt-description">
        Copy this focused handoff into your coding agent to turn the review into an implementation plan.
      </p>
      <pre class="prompt-text"><code>{prompt}</code></pre>
    </div>
  {/if}
</section>

<style>
  .prompt-card {
    margin-bottom: var(--space-xl);
    background: linear-gradient(135deg, rgba(240, 233, 223, 0.55), rgba(255, 255, 255, 0.35));
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    animation: fadeSlideUp 0.5s ease 0.12s both;
  }

  .prompt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-lg);
  }

  .prompt-heading {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .prompt-icon {
    color: var(--color-text-muted);
    font-size: 1.25rem;
    line-height: 1.2;
  }

  .prompt-eyebrow {
    display: block;
    margin-bottom: var(--space-xs);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .prompt-title {
    color: var(--color-text-secondary);
    font-family: var(--font-display);
    font-size: 1.2rem;
  }

  .toggle-button,
  .copy-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 600;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .toggle-button {
    flex-shrink: 0;
    justify-content: center;
    min-width: 2.125rem;
    min-height: 2.125rem;
    padding: var(--space-sm);
    color: var(--color-text-muted);
    background: rgba(255, 255, 255, 0.45);
  }

  .toggle-button:hover {
    border-color: var(--color-accent-light);
    background: rgba(255, 255, 255, 0.75);
    color: var(--color-accent);
  }

  .chevron {
    display: block;
    width: 1rem;
    height: 1rem;
  }

  .prompt-content {
    padding: 0 var(--space-lg) var(--space-lg);
  }

  .prompt-description {
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .prompt-text {
    max-height: 280px;
    margin: var(--space-md) 0;
    padding: var(--space-md);
    overflow: auto;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.45);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .prompt-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-sm);
    flex-shrink: 0;
  }

  .copy-button {
    padding: var(--space-sm) var(--space-md);
    color: #fff;
    background: var(--color-accent);
    border-color: var(--color-accent);
    flex-shrink: 0;
  }

  .copy-button:hover {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }

  .copy-feedback {
    color: var(--color-sage);
    font-size: 0.78rem;
    line-height: 1.4;
    max-width: 14rem;
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

  @media (max-width: 640px) {
    .prompt-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .prompt-actions {
      align-self: flex-end;
      align-items: flex-end;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .copy-feedback {
      flex-basis: 100%;
      text-align: right;
    }
  }
</style>
