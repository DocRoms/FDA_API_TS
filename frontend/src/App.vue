<template>
  <main class="app">
    <header class="app__header">
      <h1>FDA Drug Browser</h1>
      <p class="app__subtitle">
        Liste paginée de médicaments issus de l'API publique de la FDA.
      </p>
    </header>

    <section class="layout">
      <section class="panel panel--main">
        <header class="panel__header">
          <h2>Liste des médicaments</h2>
          <form class="filters" @submit.prevent="applySearch">
            <label class="field">
              <span>Recherche</span>
              <input
                v-model="searchInput"
                type="text"
                placeholder="ex: LIPITOR"
              />
            </label>
            <button type="submit" :disabled="loadingDrugs">
              Rechercher
            </button>
          </form>
        </header>

        <section class="panel__body">
          <p v-if="loadingDrugs">Chargement des médicaments...</p>
          <p v-else-if="drugsError" class="error">{{ drugsError }}</p>

          <template v-else>
            <table v-if="drugs.length" class="table">
              <thead>
                <tr>
                  <th @click="setSort('productName')">
                    Nom de marque
                    <span v-if="sortIndicator('productName')">{{ sortIndicator('productName') }}</span>
                  </th>
                  <th @click="setSort('substanceName')">
                    Substances actives
                    <span v-if="sortIndicator('substanceName')">{{ sortIndicator('substanceName') }}</span>
                  </th>
                  <th @click="setSort('sponsorName')">
                    Laboratoire
                    <span v-if="sortIndicator('sponsorName')">{{ sortIndicator('sponsorName') }}</span>
                  </th>
                  <th @click="setSort('applicationNumber')">
                    Numéro d'application
                    <span v-if="sortIndicator('applicationNumber')">{{ sortIndicator('applicationNumber') }}</span>
                  </th>
                  <th @click="setSort('route')">
                    Voie d'admission
                    <span v-if="sortIndicator('route')">{{ sortIndicator('route') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="drug in sortedDrugs"
                  :key="drug.id"
                  class="table-row--clickable"
                  @click="selectDrug(drug)"
                >
                  <td>{{ drug.productName || '—' }}</td>
                  <td>{{ drug.substanceName || '—' }}</td>
                  <td>{{ drug.sponsorName || '—' }}</td>
                  <td>{{ drug.applicationNumber || '—' }}</td>
                  <td>{{ drug.route || '—' }}</td>
                </tr>
              </tbody>
            </table>

            <p v-else>Aucun résultat pour ces critères.</p>
          </template>
        </section>

        <footer v-if="total > 0" class="panel__footer">
          <div class="pagination">
            <button
              type="button"
              :disabled="page === 1 || loadingDrugs"
              @click="goToPage(page - 1)"
            >
              Précédent
            </button>
            <span>Page {{ page }} ({{ pageSize }} / page) – {{ total }} résultats</span>
            <button
              type="button"
              :disabled="page * pageSize >= total || loadingDrugs"
              @click="goToPage(page + 1)"
            >
              Suivant
            </button>
          </div>
        </footer>
      </section>

      <aside class="panel panel--side">
        <header class="panel__header">
          <h2>Détail du médicament</h2>
        </header>
        <section class="panel__body">
          <section v-if="selectedDrugDetail" class="detail-block">
            <p class="panel__hint">
              Informations issues de l'API FDA pour l'application {{ selectedDrugDetail.applicationNumber }}.
            </p>
            <p><strong>Laboratoire :</strong> {{ selectedDrugDetail.sponsorName || '—' }}</p>
            <div
              v-for="(product, index) in selectedDrugDetail.products"
              :key="index"
              class="detail-product"
            >
              <h3>
                {{ product.brandName || 'Produit' }}
                <span v-if="product.strength">
                  · {{ product.strength }}
                </span>
              </h3>
              <p><strong>Nom générique :</strong> {{ product.genericName || '—' }}</p>
              <p><strong>Voie d'admission :</strong> {{ product.route || '—' }}</p>
              <p><strong>Forme pharmaceutique :</strong> {{ product.dosageForm || '—' }}</p>
              <p><strong>Statut marketing :</strong> {{ product.marketingStatus || '—' }}</p>
              <p><strong>Numéro de produit :</strong> {{ product.productNumber || '—' }}</p>
              <p><strong>Code TE :</strong> {{ product.teCode || '—' }}</p>
              <p>
                <strong>Substances actives :</strong>
                {{ product.substances.length ? product.substances.join(', ') : '—' }}
              </p>
            </div>

            <div v-if="selectedDrugDetail.documents && selectedDrugDetail.documents.length" class="detail-docs">
              <h3>Documents FDA</h3>
              <ul class="detail-docs__list">
                <li v-for="(doc, index) in selectedDrugDetail.documents" :key="index">
                  <template v-if="doc.url">
                    <a
                      :href="doc.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ doc.type || 'Document FDA' }}
                    </a>
                  </template>
                  <template v-else>
                    <span>{{ doc.type || 'Document FDA' }}</span>
                  </template>
                  <span v-if="doc.effectiveDate" class="detail-docs__date">
                    — {{ new Date(doc.effectiveDate).toLocaleDateString('fr-FR') }}
                  </span>
                </li>
              </ul>
            </div>
          </section>
          <section v-else class="detail-empty">
            <p class="panel__hint">
              Sélectionnez un médicament dans la liste pour afficher son détail.
            </p>
          </section>
        </section>
      </aside>
    </section>

    <section class="panel panel--ping">
      <header class="panel__header">
        <h2>Diagnostic /ping</h2>
        <p class="panel__hint">
          Endpoint de test pour vérifier la santé du backend.
        </p>
      </header>
      <section class="panel__body">
        <button :disabled="loadingPing" @click="fetchPing">
          Appeler /ping
        </button>
        <p v-if="loadingPing">Chargement...</p>
        <pre v-if="pingError" class="error">{{ pingError }}</pre>
        <pre v-if="pingResponse && !pingError" class="response">{{ pingResponse }}</pre>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';

interface DrugItem {
  id: string;
  applicationNumber: string | null;
  sponsorName: string | null;
  productName: string | null;
  substanceName: string | null;
  route: string | null;
}

interface DrugDetailProduct {
  brandName: string | null;
  genericName: string | null;
  route: string | null;
  dosageForm: string | null;
  marketingStatus: string | null;
  productNumber: string | null;
  teCode: string | null;
  strength: string | null;
  substances: string[];
}

interface DrugDocument {
  type: string | null;
  url: string | null;
  effectiveDate: string | null;
}

interface DrugDetail {
  applicationNumber: string;
  sponsorName: string | null;
  products: DrugDetailProduct[];
  documents: DrugDocument[];
}

type SortKey = 'productName' | 'substanceName' | 'sponsorName' | 'applicationNumber' | 'route';

const drugs = ref<DrugItem[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loadingDrugs = ref(false);
const drugsError = ref<string | null>(null);
const search = ref<string>('');
const searchInput = ref<string>('');

const pingResponse = ref<string | null>(null);
const pingError = ref<string | null>(null);
const loadingPing = ref(false);

const selectedDrug = ref<DrugItem | null>(null);
const selectedDrugDetail = ref<DrugDetail | null>(null);
const loadingDetail = ref(false);
const detailError = ref<string | null>(null);

// Tri par défaut : nom de marque ascendant
const sortKey = ref<SortKey | null>('productName');
const sortDirection = ref<'asc' | 'desc'>('asc');

const sortedDrugs = computed<DrugItem[]>(() => {
  if (!sortKey.value) {
    return drugs.value;
  }

  const key = sortKey.value;
  const dir = sortDirection.value === 'asc' ? 1 : -1;

  return [...drugs.value].sort((a, b) => {
    const va = (a[key] ?? '').toString().toLowerCase();
    const vb = (b[key] ?? '').toString().toLowerCase();
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
});

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDirection.value = 'asc';
  }
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return '';
  return sortDirection.value === 'asc' ? '▲' : '▼';
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function fetchDrugs() {
  loadingDrugs.value = true;
  drugsError.value = null;

  const params = new URLSearchParams();
  params.set('page', String(page.value));
  params.set('pageSize', String(pageSize.value));
  if (search.value.trim()) {
    params.set('search', search.value.trim());
  }

  try {
    const res = await fetch(`/api/drugs?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    drugs.value = data.items ?? [];
    total.value = data.total ?? 0;
    page.value = data.page ?? page.value;
    pageSize.value = data.pageSize ?? pageSize.value;
  } catch (err: unknown) {
    drugsError.value = formatErrorMessage(err);
  } finally {
    loadingDrugs.value = false;
  }
}

function applySearch() {
  search.value = searchInput.value;
  page.value = 1;
  fetchDrugs();
}

function goToPage(newPage: number) {
  page.value = newPage;
  fetchDrugs();
}

async function fetchPing() {
  loadingPing.value = true;
  pingError.value = null;
  pingResponse.value = null;

  try {
    const res = await fetch('/api/ping');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    pingResponse.value = JSON.stringify(data, null, 2);
  } catch (err: unknown) {
    pingError.value = formatErrorMessage(err);
  } finally {
    loadingPing.value = false;
  }
}

async function fetchDrugDetail(applicationNumber: string) {
  loadingDetail.value = true;
  detailError.value = null;
  selectedDrugDetail.value = null;

  try {
    const res = await fetch(`/api/drugs/${encodeURIComponent(applicationNumber)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as DrugDetail;
    selectedDrugDetail.value = data;
  } catch (err: unknown) {
    detailError.value = formatErrorMessage(err);
  } finally {
    loadingDetail.value = false;
  }
}

function selectDrug(drug: DrugItem) {
  if (!drug.applicationNumber) {
    return;
  }
  selectedDrug.value = drug;
  fetchDrugDetail(drug.applicationNumber);
}

onMounted(() => {
  fetchDrugs();
});
</script>

<style scoped>
.app {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 1200px;
  margin: 2rem auto;
  padding: 1.5rem;
}

.app__header {
  margin-bottom: 1.5rem;
}

.app__subtitle {
  color: #6b7280;
  margin-top: 0.25rem;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1.4fr);
  gap: 1.5rem;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  background-color: #ffffff;
}

.panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.panel__hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.panel__body {
  font-size: 0.9rem;
}

.panel__footer {
  margin-top: 1rem;
}

.filters {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'] {
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  min-width: 200px;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  cursor: pointer;
  background-color: #f3f4f6;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table th,
.table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.table th {
  background-color: #f9fafb;
  cursor: pointer;
  user-select: none;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

pre {
  background: #111827;
  color: #e5e7eb;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-top: 0.75rem;
  white-space: pre-wrap;
}

.error {
  background: #7f1d1d;
}

.panel--ping {
  margin-top: 1.5rem;
}

.detail-block {
  margin-bottom: 0;
}

.detail-empty {
  font-size: 0.9rem;
  color: #6b7280;
}

.table-row--clickable {
  cursor: pointer;
}

.detail-product {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.detail-docs {
  margin-top: 1rem;
}

.detail-docs__list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}

.detail-docs__list li {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.detail-docs__list a {
  color: #1d4ed8;
  text-decoration: underline;
}

.detail-docs__date {
  color: #6b7280;
  margin-left: 0.25rem;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
