<template>
  <div class="mcf-result-panel">
    <div class="result-grid">
      <!-- Итоговая карточка -->
      <div class="result-summary-card card highlight-card">
        <h3 class="card-title">{{ t('mr.title') }}</h3>
        <div class="metrics-row">
          <div class="metric-item">
            <span class="metric-label">{{ t('mr.total_cost') }}</span>
            <span class="metric-value text-accent">{{ solution.totalCost }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ t('mr.total_flow') }}</span>
            <span class="metric-value text-green">{{ solution.totalFlow }}</span>
          </div>
        </div>

        <div class="status-summary" :class="{ 'status-balanced': solution.isBalanced }">
          <div class="status-icon">{{ solution.isBalanced ? '✅' : '⚠️' }}</div>
          <div class="status-text">
            <h4>{{ solution.isBalanced ? t('mr.balanced') : t('mr.imbalanced') }}</h4>
            <p v-if="solution.isBalanced">
              {{ t('mr.balanced_desc') }}
            </p>
            <p v-else>
              {{ solution.supplySum }} ≠ {{ solution.demandSum }}
            </p>
          </div>
        </div>
      </div>

      <!-- Таблица распределения потоков -->
      <div class="result-details-card card">
        <h3 class="card-title">{{ t('mr.table_title') }}</h3>
        <div class="table-container">
          <table class="result-table">
            <thead>
              <tr>
                <th>{{ t('mr.col_route') }}</th>
                <th>{{ t('mr.col_tariff') }}</th>
                <th>{{ t('mr.col_load') }}</th>
                <th>{{ t('mr.col_share') }}</th>
                <th>{{ t('mr.col_segment_cost') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="edge in flowEdges" :key="`res-edge-${edge.id}`">
                <td>
                  <span class="route-node">{{ nodeLabelOf(edge.from) }}</span>
                  <span class="route-arrow">→</span>
                  <span class="route-node">{{ nodeLabelOf(edge.to) }}</span>
                </td>
                <td>{{ edge.cost }}</td>
                <td class="font-bold">{{ edge.flow ?? 0 }} / {{ edge.capacity }}</td>
                <td>
                  <div class="progress-bar-container">
                    <div
                      class="progress-bar-fill"
                      :style="{ width: ((edge.flow ?? 0) / edge.capacity * 100) + '%' }"
                      :class="progressBarClass((edge.flow ?? 0) / edge.capacity)"
                    ></div>
                    <span class="progress-percent-text">
                      {{ Math.round((edge.flow ?? 0) / edge.capacity * 100) }}%
                    </span>
                  </div>
                </td>
                <td class="font-bold text-accent">{{ (edge.flow ?? 0) * edge.cost }}</td>
              </tr>
              <tr v-if="flowEdges.length === 0">
                <td colspan="5" class="empty-table-text">{{ t('mr.no_flows') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../locale'
import type { McfSolution } from '../core/mincostflow'

const props = defineProps<{
  solution: McfSolution
}>()

// Отбираем только те ребра, по которым фактически идет поток
const flowEdges = computed(() => {
  return props.solution.edges.filter(e => (e.flow ?? 0) > 0)
})

function nodeLabelOf(id: number): string {
  return props.solution.nodes.find(n => n.id === id)?.label ?? String(id)
}

function progressBarClass(ratio: number): string {
  if (ratio >= 0.9) return 'bar-danger' // Почти полностью заполнен
  if (ratio >= 0.5) return 'bar-warning' // Средняя загрузка
  return 'bar-success' // Легкая загрузка
}
</script>

<style scoped>
.mcf-result-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.highlight-card {
  border-color: var(--accent);
  background: linear-gradient(180deg, var(--bg-card) 0%, rgba(99,179,237,0.02) 100%);
}

.metrics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.metric-label {
  font-size: 11px;
  color: var(--text-dim);
  text-transform: uppercase;
}
.metric-value {
  font-size: 28px;
  font-weight: 800;
}
.text-accent { color: var(--accent); }
.text-green { color: var(--accent3); }

.status-summary {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(229,62,62,0.06);
  border: 1px solid rgba(229,62,62,0.15);
}
.status-summary.status-balanced {
  background: rgba(44,182,125,0.06);
  border-color: rgba(44,182,125,0.15);
}

.status-icon {
  font-size: 24px;
  flex-shrink: 0;
}
.status-text h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.status-text p {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.result-details-card {
  padding: 24px;
  border: 1px solid var(--border);
}

.table-container {
  overflow-x: auto;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
}
.result-table th, .result-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.result-table th {
  color: var(--text-dim);
  font-weight: 600;
}

.route-node {
  font-weight: 700;
  color: var(--text-primary);
}
.route-arrow {
  color: var(--text-dim);
  margin: 0 6px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--bg-input);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
}
.progress-percent-text {
  position: absolute;
  right: 6px;
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  mix-blend-mode: difference;
}

.bar-success { background: var(--accent3); }
.bar-warning { background: var(--accent-nw); }
.bar-danger { background: #f56565; }

.empty-table-text {
  text-align: center;
  color: var(--text-dim);
  padding: 20px;
  font-style: italic;
}
</style>
