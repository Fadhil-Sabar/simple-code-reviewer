<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="app">
  {@render children()}
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(:root) {
    /* Earth tone palette */
    --color-bg: #faf6f1;
    --color-surface: #f0e9df;
    --color-surface-raised: #ffffff;
    --color-border: #d4c5b2;
    --color-border-subtle: #e8dfd4;

    --color-text: #3d2b1f;
    --color-text-secondary: #7a6b5d;
    --color-text-muted: #a89888;

    --color-accent: #8b5e3c;
    --color-accent-hover: #6d4a2e;
    --color-accent-light: #c4a882;

    --color-sage: #6b7c5e;
    --color-sage-light: #e8ede5;
    --color-clay: #c4956a;
    --color-clay-light: #f5ece3;
    --color-terracotta: #b85c48;
    --color-terracotta-light: #f9ebe7;

    /* Typography */
    --font-display: 'DM Serif Display', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2.5rem;
    --space-2xl: 4rem;

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;

    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(61, 43, 31, 0.06);
    --shadow-md: 0 4px 12px rgba(61, 43, 31, 0.08);
    --shadow-lg: 0 8px 30px rgba(61, 43, 31, 0.1);

    font-family: var(--font-body);
    color: var(--color-text);
    background-color: var(--color-bg);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(body) {
    min-height: 100vh;
  }

  :global(::selection) {
    background-color: var(--color-accent-light);
    color: var(--color-text);
  }

  :global(textarea:focus),
  :global(button:focus-visible) {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
