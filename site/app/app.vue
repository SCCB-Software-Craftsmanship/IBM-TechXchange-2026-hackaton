<script setup lang="ts">
/* A single scrolling deck. Every section is an anchor the nav tracks. */
useReveal()
</script>

<template>
  <div>
    <a
      href="#home"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm"
      style="background: var(--accent); color: #fff"
    >
      Skip to content
    </a>

    <AppNav />

    <main>
      <HeroSection />
      <HowItWorks />
      <PipelineSection />
      <MetricsSection />
      <SetupSection />
      <GithubSection />
    </main>

    <AppFooter />
  </div>
</template>
