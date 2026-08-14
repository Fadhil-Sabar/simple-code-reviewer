<script lang="ts">
  interface Props {
    score: number;
  }

  let { score }: Props = $props();

  const size = 140;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = $derived(circumference - (score / 10) * circumference);

  let scoreColor = $derived(
    score >= 8 ? 'var(--color-sage)' : score >= 5 ? 'var(--color-clay)' : 'var(--color-terracotta)'
  );
</script>

<div class="score-ring" style="--score-color: {scoreColor}; --offset: {offset}; --circumference: {circumference}">
  <svg width={size} height={size} viewBox="0 0 {size} {size}">
    <circle
      class="ring-bg"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={strokeWidth}
    />
    <circle
      class="ring-progress"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={strokeWidth}
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      stroke-linecap="round"
      transform="rotate(-90 {size / 2} {size / 2})"
    />
  </svg>
  <div class="score-text">
    <span class="score-number">{score}</span>
    <span class="score-max">/10</span>
  </div>
</div>

<style>
  .score-ring {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 140px;
    height: 140px;
  }

  .ring-bg {
    stroke: var(--color-border-subtle);
  }

  .ring-progress {
    stroke: var(--score-color);
    transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1),
                stroke 0.4s ease;
  }

  .score-text {
    position: absolute;
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  .score-number {
    font-family: var(--font-display);
    font-size: 2.8rem;
    line-height: 1;
    color: var(--color-text);
  }

  .score-max {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-weight: 300;
  }
</style>
