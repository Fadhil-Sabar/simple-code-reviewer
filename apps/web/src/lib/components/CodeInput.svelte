<script lang="ts">
  interface Props {
    value: string;
    disabled?: boolean;
    placeholder?: string;
  }

  let {
    value = $bindable(''),
    disabled = false,
    placeholder = 'Paste your code here...'
  }: Props = $props();

  let textareaEl: HTMLTextAreaElement;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;
      value = value.substring(0, start) + '  ' + value.substring(end);
      textareaEl.selectionStart = textareaEl.selectionEnd = start + 2;
    }
  }

  let lineCount = $derived(value.split('\n').length || 1);
</script>

<div class="editor" class:disabled>
  <div class="editor-header">
    <div class="dots">
      <span class="dot dot--1"></span>
      <span class="dot dot--2"></span>
      <span class="dot dot--3"></span>
    </div>
    <span class="label">code input</span>
    {#if value.length > 0}
      <span class="char-count">{value.length} chars</span>
    {/if}
  </div>
  <div class="editor-body">
    <div class="line-numbers" aria-hidden="true">
      {#each Array(lineCount) as _, i}
        <span>{i + 1}</span>
      {/each}
    </div>
    <textarea
      bind:this={textareaEl}
      bind:value
      {disabled}
      {placeholder}
      onkeydown={handleKeydown}
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
    ></textarea>
  </div>
</div>

<style>
  .editor {
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .editor:focus-within {
    border-color: var(--color-accent);
    box-shadow: var(--shadow-lg), 0 0 0 3px rgba(139, 94, 60, 0.08);
  }

  .editor.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-lg);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-border);
  }

  .dot--1 {
    background: var(--color-terracotta);
    opacity: 0.7;
  }

  .dot--2 {
    background: var(--color-clay);
    opacity: 0.7;
  }

  .dot--3 {
    background: var(--color-sage);
    opacity: 0.7;
  }

  .label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex: 1;
  }

  .char-count {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .editor-body {
    display: flex;
    min-height: 280px;
    max-height: 450px;
  }

  .line-numbers {
    display: flex;
    flex-direction: column;
    padding: var(--space-md) 0;
    padding-left: var(--space-md);
    padding-right: var(--space-sm);
    background: var(--color-surface);
    border-right: 1px solid var(--color-border-subtle);
    user-select: none;
    min-width: 40px;
    text-align: right;
  }

  .line-numbers span {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.65;
    color: var(--color-text-muted);
  }

  textarea {
    flex: 1;
    padding: var(--space-md) var(--space-lg);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    line-height: 1.65;
    color: var(--color-text);
    background: transparent;
    border: none;
    resize: none;
    min-height: 250px;
  }

  textarea::placeholder {
    color: var(--color-text-muted);
    font-style: italic;
  }

  textarea:focus {
    outline: none;
  }

  @media (max-width: 640px) {
    .editor-body {
      min-height: 200px;
    }

    .line-numbers {
      display: none;
    }

    textarea {
      font-size: 0.8rem;
      padding: var(--space-md);
    }
  }
</style>
