<script lang="ts">
  export let lines = 3;
</script>

<div aria-hidden="true" class="skeleton-wrapper">
  {#each Array.from({ length: lines }) as _, index}
    <div
      class="skeleton-line"
      style={`width: ${index === 0 ? "80%" : index === lines - 1 ? "55%" : "100%"};`}
    />
  {/each}
</div>

<style>
  .skeleton-wrapper {
    display: grid;
    gap: 10px;
  }

  .skeleton-line {
    height: 12px;
    border-radius: 999px;
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0% {
      background-position: 0% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
