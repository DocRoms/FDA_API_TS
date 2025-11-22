<template>
  <main class="app">
    <h1>FDA Mini App</h1>
    <section>
      <button @click="fetchPing">Appeler /ping</button>
      <p v-if="loading">Chargement...</p>
      <pre v-if="error" class="error">{{ error }}</pre>
      <pre v-if="response && !error" class="response">{{ response }}</pre>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const response = ref<string | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function fetchPing() {
  loading.value = true;
  error.value = null;
  response.value = null;

  try {
    const res = await fetch('/api/ping');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    response.value = JSON.stringify(data, null, 2);
  } catch (err: any) {
    error.value = err?.message ?? String(err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.app {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 640px;
  margin: 2rem auto;
  padding: 1.5rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid #ddd;
  cursor: pointer;
}

pre {
  background: #111827;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  white-space: pre-wrap;
}

.error {
  background: #7f1d1d;
}
</style>

