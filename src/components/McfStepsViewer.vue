<template>
  <div class="mcf-steps-viewer">
    <!-- Контролы воспроизведения -->
    <div class="anim-controls card">
      <button class="ctrl-btn" @click="goFirst" :disabled="currentStepIdx === 0" title="В начало">⏮</button>
      <button class="ctrl-btn" @click="goPrev" :disabled="currentStepIdx === 0" title="Назад">◀</button>

      <div class="progress-wrap">
        <input
          type="range"
          class="progress-slider"
          :min="0" :max="steps.length - 1"
          v-model.number="currentStepIdx"
        />
        <div class="progress-label">{{ currentStepIdx + 1 }} / {{ steps.length }}</div>
      </div>

      <button class="ctrl-btn" @click="goNext" :disabled="currentStepIdx >= steps.length - 1" title="Вперёд">▶</button>
      <button class="ctrl-btn" @click="goLast" :disabled="currentStepIdx >= steps.length - 1" title="В конец">⏭</button>

      <div class="anim-sep"></div>

      <button class="ctrl-btn play-btn" :class="{ playing: isPlaying }" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶️' }}
        <span>{{ isPlaying ? t('sv.pause') : t('sv.auto') }}</span>
      </button>
      <select class="speed-select" v-model.number="playSpeed">
        <option :value="2000">{{ t('sv.slow') }}</option>
        <option :value="1000">{{ t('sv.normal') }}</option>
        <option :value="500">{{ t('sv.fast') }}</option>
      </select>
    </div>

    <!-- Разметка шага -->
    <div class="step-viewer-layout">
      <!-- Левая колонка: Информация -->
      <div class="step-info-pane">
        <transition name="fade" mode="out-in">
          <div class="step-card card" :key="currentStepIdx" v-if="currentStep">
            <div class="step-header">
              <span class="step-phase-badge">{{ t('sv.step_badge') }} {{ currentStep.stepIndex }}</span>
              <h3 class="step-title">{{ currentStep.title }}</h3>
            </div>

            <div class="step-desc">
              <p v-for="(line, li) in currentStep.description.split('\n')" :key="li">{{ line }}</p>
            </div>

            <!-- Таблица текущих потоков -->
            <div class="table-container">
              <h4 class="table-title">{{ t('sv4.channels') }}</h4>
              <table class="mcf-table">
                <thead>
                  <tr>
                    <th>{{ t('sv4.col_channel') }}</th>
                    <th>{{ t('sv4.col_cost') }}</th>
                    <th>{{ t('sv4.col_cap') }}</th>
                    <th>{{ t('sv4.col_flow') }}</th>
                    <th>{{ t('sv4.col_state') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="edge in edges"
                    :key="`t-edge-${edge.id}`"
                    :class="{ 'is-path-edge': isEdgeInPath(edge.from, edge.to) }"
                  >
                    <td>{{ nodeLabelOf(edge.from) }} → {{ nodeLabelOf(edge.to) }}</td>
                    <td>{{ edge.cost }}</td>
                    <td>{{ edge.capacity }}</td>
                    <td class="font-bold">
                      {{ currentStep.flows[edge.id] ?? 0 }} / {{ edge.capacity }}
                    </td>
                    <td>
                      <span
                        v-if="(currentStep.flows[edge.id] ?? 0) === edge.capacity"
                        class="badge bg-red"
                      >{{ t('sv4.full') }}</span>
                      <span
                        v-else-if="(currentStep.flows[edge.id] ?? 0) > 0"
                        class="badge bg-blue"
                      >{{ t('sv4.partial') }}</span>
                      <span v-else class="badge bg-gray">{{ t('sv4.empty') }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </transition>
      </div>

      <!-- Правая колонка: Визуализация -->
      <div class="step-visual-pane card">
        <div class="pane-header">
          <span class="pane-title">{{ t('sv4.flow_map') }}</span>
          <div class="visual-legend">
            <span class="leg-dot bg-green"></span> {{ t('sv4.leg_path') }}
            <span class="leg-dot bg-blue"></span> {{ t('sv4.leg_flow') }}
            <span class="leg-dot bg-gray"></span> {{ t('sv4.leg_reserve') }}
          </div>
        </div>

        <div class="canvas-container">
          <svg class="graph-svg" viewBox="0 0 800 450" v-if="currentStep">
            <!-- Стрелки -->
            <defs>
              <marker
                id="arrow-std"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255,255,255,0.2)" />
              </marker>
              <marker
                id="arrow-path"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent3)" />
              </marker>
              <marker
                id="arrow-flow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
              </marker>
            </defs>

            <!-- Линии связей -->
            <g>
              <g v-for="edge in edgeLines" :key="`e-${edge.id}`">
                <!-- Основная линия -->
                <line
                  :x1="edge.x1"
                  :y1="edge.y1"
                  :x2="edge.x2"
                  :y2="edge.y2"
                  :stroke="edgeStrokeColor(edge)"
                  :stroke-width="edgeWidth(edge)"
                  :marker-end="`url(#arrow-${edgeMarker(edge)})`"
                  class="edge-line"
                />
                
                <!-- Подпись веса ребра (f/u по цене c) -->
                <g :transform="`translate(${edge.midX}, ${edge.midY})`">
                  <rect
                    x="-28"
                    y="-11"
                    width="56"
                    height="22"
                    rx="5"
                    fill="var(--bg-card2)"
                    :stroke="edgeStrokeColor(edge)"
                    stroke-width="1.5"
                  />
                  <text
                    y="4"
                    text-anchor="middle"
                    font-size="9"
                    font-weight="bold"
                    fill="var(--text-primary)"
                  >
                    {{ currentStep.flows[edge.id] ?? 0 }}/{{ edge.capacity }} ({{ edge.cost }})
                  </text>
                </g>
              </g>
            </g>

            <!-- Вершины -->
            <g>
              <g
                v-for="node in nodes"
                :key="`n-${node.id}`"
                :transform="`translate(${node.x}, ${node.y})`"
                class="node-group"
              >
                <!-- Подсветка пути -->
                <circle
                  v-if="isNodeInPath(node.id)"
                  r="30"
                  fill="none"
                  stroke="var(--accent3)"
                  stroke-width="2.5"
                  class="glow-ring"
                />

                <!-- Тело вершины -->
                <circle
                  r="23"
                  :fill="nodeBgColor(node)"
                  :stroke="nodeStrokeColor(node)"
                  stroke-width="2.5"
                />

                <!-- Название вершины -->
                <text
                  text-anchor="middle"
                  y="-4"
                  font-size="13"
                  font-weight="bold"
                  fill="var(--text-primary)"
                >
                  {{ node.label }}
                </text>

                <!-- Метка баланса -->
                <text
                  text-anchor="middle"
                  y="12"
                  font-size="10"
                  font-weight="bold"
                  :fill="nodeValueColor(node)"
                >
                  {{ node.value > 0 ? '+' : '' }}{{ node.value }}
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { t } from '../locale'
import type { McfNode, McfEdge, McfStep } from '../core/mincostflow'

const props = defineProps<{
  steps: McfStep[]
  nodes: McfNode[]
  edges: McfEdge[]
}>()

const currentStepIdx = ref(0)
const isPlaying = ref(false)
const playSpeed = ref(1000)
let playTimer: ReturnType<typeof setInterval> | null = null

const currentStep = computed<McfStep | null>(() => props.steps[currentStepIdx.value] ?? null)

// Навигация
function goFirst() { currentStepIdx.value = 0 }
function goLast()  { currentStepIdx.value = props.steps.length - 1 }
function goNext()  { if (currentStepIdx.value < props.steps.length - 1) currentStepIdx.value++ }
function goPrev()  { if (currentStepIdx.value > 0) currentStepIdx.value-- }

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    playTimer = setInterval(() => {
      if (currentStepIdx.value >= props.steps.length - 1) {
        isPlaying.value = false
        clearInterval(playTimer!)
      } else {
        currentStepIdx.value++
      }
    }, playSpeed.value)
  } else {
    if (playTimer) clearInterval(playTimer)
  }
}

watch(playSpeed, () => {
  if (isPlaying.value) {
    if (playTimer) clearInterval(playTimer)
    togglePlay()
    togglePlay()
  }
})

onUnmounted(() => { if (playTimer) clearInterval(playTimer) })

// Расчет линий для SVG
const edgeLines = computed(() => {
  const r = 23
  return props.edges.map(e => {
    const fromNode = props.nodes.find(n => n.id === e.from)
    const toNode = props.nodes.find(n => n.id === e.to)
    if (!fromNode || !toNode) {
      return { id: e.id, x1: 0, y1: 0, x2: 0, y2: 0, midX: 0, midY: 0, capacity: e.capacity, cost: e.cost, from: e.from, to: e.to }
    }

    const dx = toNode.x - fromNode.x
    const dy = toNode.y - fromNode.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    let x1 = fromNode.x
    let y1 = fromNode.y
    let x2 = toNode.x
    let y2 = toNode.y

    if (dist > 0) {
      const udx = dx / dist
      const udy = dy / dist
      x1 = Math.round(fromNode.x + r * udx)
      y1 = Math.round(fromNode.y + r * udy)
      x2 = Math.round(toNode.x - r * udx)
      y2 = Math.round(toNode.y - r * udy)
    }

    return {
      id: e.id,
      x1, y1, x2, y2,
      midX: Math.round((fromNode.x + toNode.x) / 2),
      midY: Math.round((fromNode.y + toNode.y) / 2),
      capacity: e.capacity,
      cost: e.cost,
      from: e.from,
      to: e.to
    }
  })
})

function nodeLabelOf(id: number): string {
  return props.nodes.find(n => n.id === id)?.label ?? String(id)
}

function isNodeInPath(id: number): boolean {
  return !!currentStep.value?.path?.includes(id)
}

function isEdgeInPath(from: number, to: number): boolean {
  if (!currentStep.value || !currentStep.value.path) return false
  const path = currentStep.value.path
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i] === from && path[i + 1] === to) return true
  }
  return false
}

// Визуализация графа
function edgeStrokeColor(edge: any): string {
  if (isEdgeInPath(edge.from, edge.to)) return 'var(--accent3)' // Зеленый для ребра в текущем пути
  
  const f = currentStep.value?.flows[edge.id] ?? 0
  if (f > 0) return 'var(--accent)' // Синий для ребер с потоком
  return 'rgba(255,255,255,0.12)'
}

function edgeWidth(edge: any): number {
  if (isEdgeInPath(edge.from, edge.to)) return 3.5
  const f = currentStep.value?.flows[edge.id] ?? 0
  if (f > 0) return 2.5
  return 1.5
}

function edgeMarker(edge: any): string {
  if (isEdgeInPath(edge.from, edge.to)) return 'path'
  const f = currentStep.value?.flows[edge.id] ?? 0
  if (f > 0) return 'flow'
  return 'std'
}

function nodeBgColor(node: McfNode): string {
  if (isNodeInPath(node.id)) return 'rgba(44,182,125,0.12)'
  if (node.value > 0) return 'rgba(44,182,125,0.05)'
  if (node.value < 0) return 'rgba(229,62,62,0.05)'
  return 'var(--bg-input)'
}

function nodeStrokeColor(node: McfNode): string {
  if (isNodeInPath(node.id)) return 'var(--accent3)'
  if (node.value > 0) return 'rgba(44,182,125,0.6)'
  if (node.value < 0) return 'rgba(229,62,62,0.6)'
  return 'rgba(255,255,255,0.2)'
}

function nodeValueColor(node: McfNode): string {
  if (node.value > 0) return 'var(--accent3)'
  if (node.value < 0) return '#f56565'
  return 'var(--text-dim)'
}
</script>

<style scoped>
.mcf-steps-viewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.anim-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  flex-wrap: wrap;
  border: 1px solid var(--border);
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
}
.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.play-btn.playing {
  color: var(--accent3);
  border-color: var(--accent3);
}

.progress-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}
.progress-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-input);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
}
.progress-label {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}

.anim-sep {
  width: 1px;
  height: 28px;
  background: var(--border);
}
.speed-select {
  padding: 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.step-viewer-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 20px;
}
@media (max-width: 1000px) {
  .step-viewer-layout {
    grid-template-columns: 1fr;
  }
}

.step-info-pane {
  display: flex;
  flex-direction: column;
  min-height: 420px;
}
.step-card {
  flex: 1;
  padding: 24px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.step-phase-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(99,179,237,0.15);
  color: var(--accent);
  text-transform: uppercase;
}
.step-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.step-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.table-container {
  margin-top: 8px;
}
.table-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 8px;
}

.mcf-table {
  width: 100%;
  border-collapse: collapse;
}
.mcf-table th, .mcf-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.mcf-table th {
  color: var(--text-dim);
  font-weight: 600;
}
.is-path-edge {
  background: rgba(44,182,125,0.06);
}

.step-visual-pane {
  padding: 20px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pane-title {
  font-size: 14px;
  font-weight: 700;
}
.visual-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-dim);
}
.leg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.bg-green { background: var(--accent3); }
.bg-blue { background: var(--accent); }
.bg-gray { background: rgba(255,255,255,0.12); }

.canvas-container {
  flex: 1;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.graph-svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
