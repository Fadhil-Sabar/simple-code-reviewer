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
    <button
      class="toggle-button"
      type="button"
      aria-expanded={isExpanded}
      aria-controls="agent-prompt-content"
      onclick={() => (isExpanded = !isExpanded)}
    >
      <span>{isExpanded ? 'Hide prompt' : 'Show prompt'}</span>
      <span class:expanded={isExpanded} class="chevron" aria-hidden="true">⌄</span>
    </button>
  </div>

  {#if isExpanded}
    <div id="agent-prompt-content" class="prompt-content">
      <p class="prompt-description">
        Copy this focused handoff into your coding agent to turn the review into an implementation plan.
      </p>
      <pre class="prompt-text"><code>{prompt}</code></pre>
      <div class="prompt-actions">
        <button class="copy-button" type="button" onclick={copyPrompt}>
          <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
          <span>{copied ? 'Copied' : 'Copy prompt'}</span>
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
  {/if}
</section>

<style>
  .prompt-card {
    margin-bottom: var(--space-xl);
    background: linear-gradient(135deg, var(--color-clay-light), var(--color-surface-raised));
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
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
    color: var(--color-accent);
    font-size: 1.25rem;
    line-height: 1.2;
  }

  .prompt-eyebrow {
    display: block;
    margin-bottom: var(--space-xs);
    color: var(--color-accent);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .prompt-title {
    color: var(--color-text);
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
    padding: var(--space-sm) var(--space-md);
    color: var(--color-accent);
    background: var(--color-surface-raised);
  }

  .toggle-button:hover {
    border-color: var(--color-accent-light);
    background: var(--color-clay-light);
  }

  .chevron {
    font-size: 1rem;
    line-height: 0.7;
    transition: transform 0.2s ease;
  }

  .chevron.expanded {
    transform: rotate(180deg);
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
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.65);
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
    gap: var(--space-md);
    min-height: 2rem;
  }

  .copy-button {
    padding: var(--space-sm) var(--space-md);
    color: #fff;
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .copy-button:hover {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }

  .copy-feedback {
    color: var(--color-sage);
    font-size: 0.78rem;
    line-height: 1.4;
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

    .toggle-button {
      align-self: flex-end;
    }

    .prompt-actions {
      align-items: flex-start;
      flex-direction: column;
      gap: var(--space-sm);
    }
  }
</style>
