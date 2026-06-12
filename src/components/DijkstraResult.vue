<template>
  <div class="dijkstra-result card">
    <div class="result-header">
      <h3 class="result-title">{{ t('dr.source') }}: {{ sourceLabel }}</h3>
      <span class="badge badge-green">✓</span>
    </div>

    <div class="table-wrap">
      <table class="result-table">
        <thead>
          <tr>
            <th>{{ t('dr.destination') }}</th>
            <th>{{ t('dr.distance') }}</th>
            <th>{{ t('dr.path') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in otherNodes" :key="node.id" :class="{ 'unreachable-row': !result.reachable[node.id] }">
            <td class="node-cell">
              <span class="node-symbol">{{ node.label }}</span>
              <span class="node-desc">({{ node.label }})</span>
            </td>
            <td class="dist-cell">
              <span v-if="result.distances[node.id] === Infinity" class="badge badge-red">
                ∞ {{ t('dr.unreachable') }}
              </span>
              <span v-else-if="node.id === sourceId" class="badge badge-blue">
                0 ({{ t('dr.source') }})
              </span>
              <span v-else class="badge badge-green font-bold text-lg">
                {{ result.distances[node.id] }}
              </span>
            </td>
            <td class="path-cell">
              <div v-if="result.distances[node.id] === Infinity" class="empty-path">
                &mdash;
              </div>
              <div v-else-if="node.id === sourceId" class="start-path">
                {{ t('dr.source') }}
              </div>
              <div v-else class="path-sequence">
                <span v-for="(pathNodeId, idx) in getPathFor(node.id)" :key="idx" class="path-item">
                  <span
                    class="path-node-badge"
                    :class="{
                      'is-start': pathNodeId === sourceId,
                      'is-end': pathNodeId === node.id
                    }"
                  >
                    {{ nodeLabelOf(pathNodeId) }}
                  </span>
                  <span v-if="idx < getPathFor(node.id).length - 1" class="path-arrow">→</span>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="result-summary">
      <h4 class="summary-title">{{ t('dr.title') }}</h4>
      <ul class="summary-list">
        <li>{{ t('dr.source') }}: <strong>{{ sourceLabel }}</strong></li>
        <li>✓ {{ reachableCount }} / {{ nodes.length }}</li>
        <li v-if="maxPathNode">
          max: <strong>{{ maxPathNode.label }}</strong> = <strong>{{ result.distances[maxPathNode.id] }}</strong>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../locale'
import { getShortestPath } from '../core/dijkstra'
import type { GraphNode, DijkstraResult } from '../core/dijkstra'

const props = defineProps<{
  result: DijkstraResult
  nodes: GraphNode[]
  sourceId: number
}>()

const sourceLabel = computed(() => {
  return nodeLabelOf(props.sourceId)
})

// Все вершины, кроме источника (или все по порядку, но источник в начале)
const otherNodes = computed(() => {
  // Сортируем вершины: сначала источник, затем все остальные по алфавиту
  const sorted = [...props.nodes].sort((a, b) => a.label.localeCompare(b.label))
  const src = sorted.find(n => n.id === props.sourceId)
  const rest = sorted.filter(n => n.id !== props.sourceId)
  
  return src ? [src, ...rest] : sorted
})

const reachableCount = computed(() => {
  return props.nodes.filter(n => props.result.reachable[n.id]).length
})

// Находим достижимый узел с максимальным конечным расстоянием
const maxPathNode = computed(() => {
  let maxDist = -1
  let maxNode: GraphNode | null = null
  
  for (const node of props.nodes) {
    const d = props.result.distances[node.id]
    if (d !== Infinity && d > maxDist && node.id !== props.sourceId) {
      maxDist = d
      maxNode = node
    }
  }
  return maxNode
})

function getPathFor(targetId: number): number[] {
  return getShortestPath(props.result.previous, props.sourceId, targetId)
}

function nodeLabelOf(id: number): string {
  return props.nodes.find(n => n.id === id)?.label ?? String(id)
}
</script>

<style scoped>
.dijkstra-result {
  padding: 24px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.table-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.result-table th, .result-table td {
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--border);
}

.result-table th {
  background: var(--bg-card2);
  color: var(--text-secondary);
  font-weight: 600;
}

.result-table tbody tr {
  background: var(--bg-card);
  transition: background 0.2s;
}

.result-table tbody tr:hover {
  background: var(--bg-card2);
}

.unreachable-row {
  opacity: 0.65;
  background: rgba(229,62,98,0.02) !important;
}

.node-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-symbol {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 1.5px solid var(--border);
  color: var(--text-primary);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.node-desc {
  font-size: 13px;
  color: var(--text-dim);
}

.dist-cell {
  width: 180px;
}

.font-bold {
  font-weight: 700;
}
.text-lg {
  font-size: 15px;
}

.path-cell {
  min-width: 240px;
}

.empty-path {
  color: #f56565;
  font-style: italic;
  font-size: 13px;
}

.start-path {
  color: var(--accent);
  font-weight: 500;
  font-size: 13px;
}

.path-sequence {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.path-node-badge {
  padding: 2px 7px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.path-node-badge.is-start {
  border-color: var(--accent);
  background: rgba(99,179,237,0.08);
  color: var(--accent);
}

.path-node-badge.is-end {
  border-color: var(--accent3);
  background: rgba(44,182,125,0.08);
  color: var(--accent3);
}

.path-arrow {
  color: var(--text-dim);
  font-weight: bold;
  font-size: 12px;
}

/* Сводка */
.result-summary {
  padding: 16px;
  background: var(--bg-card2);
  border-radius: 8px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.summary-list strong {
  color: var(--text-primary);
}

.badge-red {
  background: rgba(245,101,101,0.12);
  border: 1px solid rgba(245,101,101,0.2);
  color: #f56565;
}
</style>
