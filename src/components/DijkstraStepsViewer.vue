<template>
  <div class="dijkstra-steps-viewer">
    <!-- Фазы / Фильтры -->
    <div class="phase-tabs">
      <button
        v-for="tab in phaseTabs"
        :key="tab.id"
        class="phase-tab"
        :class="{ active: activePhase === tab.id }"
        :style="{ '--tab-color': tab.color }"
        @click="activePhase = tab.id; currentStepIdx = 0"
      >
        <span class="phase-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span class="phase-count">{{ countByPhase(tab.id) }}</span>
      </button>
    </div>

    <!-- Контролы анимации -->
    <div class="anim-controls card">
      <button class="ctrl-btn" @click="goFirst" :disabled="currentStepIdx === 0" title="В начало">⏮</button>
      <button class="ctrl-btn" @click="goPrev" :disabled="currentStepIdx === 0" title="Назад">◀</button>

      <div class="progress-wrap">
        <input
          type="range"
          class="progress-slider"
          :min="0" :max="filteredSteps.length - 1"
          v-model.number="currentStepIdx"
        />
        <div class="progress-label">{{ currentStepIdx + 1 }} / {{ filteredSteps.length }}</div>
      </div>

      <button class="ctrl-btn" @click="goNext" :disabled="currentStepIdx >= filteredSteps.length - 1" title="Вперёд">▶</button>
      <button class="ctrl-btn" @click="goLast" :disabled="currentStepIdx >= filteredSteps.length - 1" title="В конец">⏭</button>

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

    <!-- Интерактивная панель шага -->
    <div class="step-viewer-layout">
      <!-- Левая колонка: описание и таблицы -->
      <div class="step-info-pane">
        <transition name="fade" mode="out-in">
          <div class="step-card card" :key="currentStepIdx" v-if="currentStep">
            <!-- Заголовок шага -->
            <div class="step-header">
              <span
                class="step-phase-badge"
                :style="{ background: phaseColor(currentStep.phase) + '20', color: phaseColor(currentStep.phase) }"
              >
                {{ phaseName(currentStep.phase) }}
              </span>
              <h3 class="step-title">{{ currentStep.title }}</h3>
            </div>

            <!-- Описание работы алгоритма -->
            <div class="step-desc">
              <p v-for="(line, li) in currentStep.description.split('\n')" :key="li">{{ line }}</p>
            </div>

            <!-- Таблица расстояний -->
            <div class="table-container">
              <h4 class="table-title">{{ t('sv3.dist_table') }}</h4>
              <table class="dijkstra-table">
                <thead>
                  <tr>
                    <th>{{ t('sv3.node_col') }}</th>
                    <th
                      v-for="node in sortedNodes"
                      :key="`th-${node.id}`"
                      :class="{
                        'is-current': node.id === currentStep.currentNode,
                        'is-relaxed-target': isRelaxedTarget(node.id)
                      }"
                    >
                      {{ node.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Строка расстояний -->
                  <tr>
                    <td class="row-label">{{ t('sv3.row_dist') }}</td>
                    <td
                      v-for="node in sortedNodes"
                      :key="`dist-${node.id}`"
                      :class="{
                        'is-visited': isNodeVisited(node.id),
                        'is-current': node.id === currentStep.currentNode,
                        'is-relaxed-target': isRelaxedTarget(node.id),
                        'val-updated': isDistUpdated(node.id)
                      }"
                    >
                      {{ getDistLabel(currentStep.distances[node.id]) }}
                    </td>
                  </tr>
                  <!-- Строка предков -->
                  <tr>
                    <td class="row-label">{{ t('sv3.row_prev') }}</td>
                    <td
                      v-for="node in sortedNodes"
                      :key="`prev-${node.id}`"
                      :class="{
                        'is-visited': isNodeVisited(node.id),
                        'is-current': node.id === currentStep.currentNode,
                        'is-relaxed-target': isRelaxedTarget(node.id),
                        'val-updated': isDistUpdated(node.id)
                      }"
                    >
                      {{ getPrevNodeLabel(currentStep.previous[node.id]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Дополнительная информация -->
            <div class="queue-panel">
              <div class="queue-stat">
                <span class="q-label">{{ t('sv3.visited') }}</span>
                <div class="node-chips">
                  <span v-for="id in currentStep.visited" :key="`v-${id}`" class="node-chip chip-green">
                    {{ nodeLabelOf(id) }}
                  </span>
                  <span v-if="currentStep.visited.length === 0" class="empty-list">—</span>
                </div>
              </div>
              <div class="queue-stat">
                <span class="q-label">{{ t('sv3.queue') }}</span>
                <div class="node-chips">
                  <span v-for="id in currentStep.queue" :key="`q-${id}`" class="node-chip chip-blue">
                    {{ nodeLabelOf(id) }}
                  </span>
                  <span v-if="currentStep.queue.length === 0" class="empty-list">—</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Правая колонка: Визуализация графа -->
      <div class="step-visual-pane card">
        <div class="pane-header">
          <span class="pane-title">{{ t('sv3.net_state') }}</span>
          <div class="visual-legend">
            <span class="leg-dot bg-green"></span> {{ t('sv3.leg_visited') }}
            <span class="leg-dot bg-yellow"></span> {{ t('sv3.leg_current') }}
            <span class="leg-dot bg-blue"></span> {{ t('sv3.leg_queue') }}
          </div>
        </div>

        <div class="canvas-container">
          <svg class="graph-svg" viewBox="0 0 800 450" v-if="currentStep">
            <!-- Стрелки -->
            <defs>
              <marker
                id="arrow-sub"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255,255,255,0.15)" />
              </marker>
              <marker
                id="arrow-tree"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
              </marker>
              <marker
                id="arrow-relax"
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
                id="arrow-skip"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent-nw)" />
              </marker>
            </defs>

            <!-- Рёбра -->
            <g>
              <g v-for="edge in edgeLines" :key="`e-${edge.id}`">
                <!-- Линия ребра -->
                <line
                  :x1="edge.x1"
                  :y1="edge.y1"
                  :x2="edge.x2"
                  :y2="edge.y2"
                  :stroke="edgeColor(edge)"
                  :stroke-width="edgeWidth(edge)"
                  :stroke-dasharray="edgeDash(edge)"
                  :marker-end="directed ? `url(#arrow-${edgeMarker(edge)})` : ''"
                  class="edge-line"
                />
                
                <!-- Вес ребра -->
                <g :transform="`translate(${edge.midX}, ${edge.midY})`">
                  <rect
                    x="-14"
                    y="-10"
                    width="28"
                    height="20"
                    rx="5"
                    :fill="edgeWeightBg(edge)"
                    :stroke="edgeColor(edge)"
                    stroke-width="1"
                  />
                  <text
                    y="4"
                    text-anchor="middle"
                    font-size="11"
                    font-weight="bold"
                    :fill="edgeWeightText(edge)"
                  >
                    {{ edge.weight }}
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
                <!-- Дополнительный индикатор для текущего узла -->
                <circle
                  v-if="node.id === currentStep.currentNode"
                  r="27"
                  fill="none"
                  stroke="var(--accent-nw)"
                  stroke-width="2.5"
                  class="glow-ring"
                />

                <!-- Задний круг -->
                <circle
                  r="21"
                  :fill="nodeBgColor(node.id)"
                  :stroke="nodeStrokeColor(node.id)"
                  stroke-width="2.5"
                />

                <!-- Название вершины -->
                <text
                  text-anchor="middle"
                  y="-2"
                  font-size="13"
                  font-weight="bold"
                  fill="var(--text-primary)"
                >
                  {{ node.label }}
                </text>

                <!-- Метка расстояния (d) над вершиной -->
                <text
                  text-anchor="middle"
                  y="12"
                  font-size="9"
                  font-weight="bold"
                  :fill="nodeDistColor(node.id)"
                >
                  d={{ getDistLabel(currentStep.distances[node.id]) }}
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
import type { GraphNode, GraphEdge, DijkstraStep } from '../core/dijkstra'

const props = defineProps<{
  steps: DijkstraStep[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  directed: boolean
}>()

type PhaseFilterId = 'all' | 'init' | 'select' | 'relax' | 'done'

const phaseTabs: { id: PhaseFilterId; label: string; icon: string; color: string }[] = [
  { id: 'all',    label: t('sv3.all'),    icon: '📋', color: '#a0aec0' },
  { id: 'init',   label: t('sv3.init'),   icon: '⚙️', color: '#63b3ed' },
  { id: 'select', label: t('sv3.select'), icon: '🎯', color: '#f6ad55' },
  { id: 'relax',  label: t('sv3.relax'),  icon: '⚡', color: '#2cb67d' },
  { id: 'done',   label: t('sv3.done'),   icon: '🏆', color: '#9f7aea' },
]

const activePhase = ref<PhaseFilterId>('all')
const currentStepIdx = ref(0)
const isPlaying = ref(false)
const playSpeed = ref(1000)
let playTimer: ReturnType<typeof setInterval> | null = null

// Сортировка вершин по ID для красивой таблицы
const sortedNodes = computed(() => {
  return [...props.nodes].sort((a, b) => a.id - b.id)
})

const filteredSteps = computed(() => {
  if (activePhase.value === 'all') return props.steps
  return props.steps.filter(s => s.phase === activePhase.value)
})

const currentStep = computed<DijkstraStep | null>(() => filteredSteps.value[currentStepIdx.value] ?? null)

// Функции навигации
function goFirst() { currentStepIdx.value = 0 }
function goLast()  { currentStepIdx.value = filteredSteps.value.length - 1 }
function goNext()  { if (currentStepIdx.value < filteredSteps.value.length - 1) currentStepIdx.value++ }
function goPrev()  { if (currentStepIdx.value > 0) currentStepIdx.value-- }

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    playTimer = setInterval(() => {
      if (currentStepIdx.value >= filteredSteps.value.length - 1) {
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

watch(activePhase, () => {
  currentStepIdx.value = 0
  isPlaying.value = false
  if (playTimer) clearInterval(playTimer)
})

onUnmounted(() => { if (playTimer) clearInterval(playTimer) })

function countByPhase(id: PhaseFilterId): number {
  if (id === 'all') return props.steps.length
  return props.steps.filter(s => s.phase === id).length
}

function phaseName(phase: string): string {
  switch (phase) {
    case 'init':   return t('sv3.phase_init')
    case 'select': return t('sv3.phase_select')
    case 'relax':  return t('sv3.phase_relax')
    case 'skip':   return t('sv3.phase_skip')
    case 'done':   return t('sv3.phase_done')
    default: return phase
  }
}

function phaseColor(phase: string): string {
  switch (phase) {
    case 'init': return '#63b3ed' // Синий
    case 'select': return '#f6ad55' // Оранжевый/Желтый
    case 'relax': return '#2cb67d' // Зеленый
    case 'skip': return '#e53e3e' // Красный
    case 'done': return '#9f7aea' // Фиолетовый
    default: return '#a0aec0'
  }
}

function getDistLabel(d: number): string {
  return d === Infinity ? '∞' : String(d)
}

function getPrevNodeLabel(prevId: number | null): string {
  if (prevId === null) return '—'
  return nodeLabelOf(prevId)
}

function nodeLabelOf(id: number): string {
  return props.nodes.find(n => n.id === id)?.label ?? String(id)
}

// Хелперы состояния вершин
function isNodeVisited(id: number): boolean {
  return !!currentStep.value?.visited.includes(id)
}

function isNodeInQueue(id: number): boolean {
  return !!currentStep.value?.queue.includes(id)
}

function isRelaxedTarget(id: number): boolean {
  return currentStep.value?.relaxed?.to === id
}

function isDistUpdated(id: number): boolean {
  if (!currentStep.value || currentStep.value.phase !== 'relax') return false
  return currentStep.value.relaxed?.to === id && currentStep.value.relaxed.newDist < currentStep.value.relaxed.oldDist
}

// Расчет линий ребер для SVG
const edgeLines = computed(() => {
  const r = 21 // Радиус круга вершины
  return props.edges.map(e => {
    const fromNode = props.nodes.find(n => n.id === e.from)
    const toNode = props.nodes.find(n => n.id === e.to)
    if (!fromNode || !toNode) {
      return { id: e.id, x1: 0, y1: 0, x2: 0, y2: 0, midX: 0, midY: 0, weight: e.weight, from: e.from, to: e.to }
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

    const midX = Math.round((fromNode.x + toNode.x) / 2)
    const midY = Math.round((fromNode.y + toNode.y) / 2)

    return {
      id: e.id,
      x1,
      y1,
      x2,
      y2,
      midX,
      midY,
      weight: e.weight,
      from: e.from,
      to: e.to
    }
  })
})

// Визуализация графа: ребра
function isEdgeRelaxing(edge: any): boolean {
  if (!currentStep.value) return false
  const r = currentStep.value.relaxed
  if (!r) return false

  if (props.directed) {
    return r.from === edge.from && r.to === edge.to
  } else {
    return (r.from === edge.from && r.to === edge.to) || (r.from === edge.to && r.to === edge.from)
  }
}

function isShortestPathTreeEdge(edge: any): boolean {
  if (!currentStep.value) return false
  const prev = currentStep.value.previous
  
  // Проверяем, является ли ребро частью дерева кратчайших путей
  if (props.directed) {
    return prev[edge.to] === edge.from
  } else {
    return prev[edge.to] === edge.from || prev[edge.from] === edge.to
  }
}

function edgeColor(edge: any): string {
  if (!currentStep.value) return 'rgba(255,255,255,0.15)'
  
  // Если ребро сейчас релаксируется или проверяется
  if (isEdgeRelaxing(edge)) {
    if (currentStep.value.phase === 'relax') return 'var(--accent3)' // зеленый - успешная релаксация
    if (currentStep.value.phase === 'skip') return 'var(--accent-nw)' // оранжевый - пропуск
  }

  // Если ребро входит в построенное дерево путей
  if (isShortestPathTreeEdge(edge)) {
    return 'var(--accent)' // синий
  }

  return 'rgba(255,255,255,0.1)'
}

function edgeWidth(edge: any): number {
  if (isEdgeRelaxing(edge)) return 3.5
  if (isShortestPathTreeEdge(edge)) return 2.5
  return 1.5
}

function edgeDash(edge: any): string {
  if (isEdgeRelaxing(edge)) return '4,2'
  return 'none'
}

function edgeMarker(edge: any): string {
  if (isEdgeRelaxing(edge)) {
    if (currentStep.value?.phase === 'relax') return 'relax'
    return 'skip'
  }
  if (isShortestPathTreeEdge(edge)) return 'tree'
  return 'sub'
}

function edgeWeightBg(edge: any): string {
  if (isEdgeRelaxing(edge)) {
    return currentStep.value?.phase === 'relax' ? 'rgba(44,182,125,0.15)' : 'rgba(246,173,85,0.15)'
  }
  if (isShortestPathTreeEdge(edge)) {
    return 'rgba(99,179,237,0.1)'
  }
  return 'var(--bg-card2)'
}

function edgeWeightText(edge: any): string {
  if (isEdgeRelaxing(edge)) {
    return currentStep.value?.phase === 'relax' ? 'var(--accent3)' : 'var(--accent-nw)'
  }
  if (isShortestPathTreeEdge(edge)) {
    return 'var(--accent)'
  }
  return 'var(--text-secondary)'
}

// Визуализация графа: вершины
function nodeBgColor(id: number): string {
  if (!currentStep.value) return 'var(--bg-input)'
  
  if (id === currentStep.value.currentNode) {
    return 'rgba(246,173,85,0.12)' // золотой
  }
  if (isNodeVisited(id)) {
    return 'rgba(44,182,125,0.1)' // зеленый
  }
  if (isNodeInQueue(id)) {
    return 'rgba(99,179,237,0.06)' // голубой
  }
  return 'var(--bg-input)'
}

function nodeStrokeColor(id: number): string {
  if (!currentStep.value) return 'rgba(255,255,255,0.2)'
  
  if (id === currentStep.value.currentNode) {
    return 'var(--accent-nw)'
  }
  if (isNodeVisited(id)) {
    return 'var(--accent3)'
  }
  if (isNodeInQueue(id)) {
    return 'var(--accent)'
  }
  return 'rgba(255,255,255,0.12)'
}

function nodeDistColor(id: number): string {
  if (!currentStep.value) return 'var(--text-dim)'
  
  if (id === currentStep.value.currentNode) {
    return 'var(--accent-nw)'
  }
  if (isNodeVisited(id)) {
    return 'var(--accent3)'
  }
  return 'var(--text-dim)'
}
</script>

<style scoped>
.dijkstra-steps-viewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Phase tabs */
.phase-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.phase-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.phase-tab:hover {
  border-color: var(--tab-color, var(--accent));
  color: var(--tab-color, var(--accent));
}
.phase-tab.active {
  background: color-mix(in srgb, var(--tab-color, var(--accent)) 12%, transparent);
  border-color: var(--tab-color, var(--accent));
  color: var(--tab-color, var(--accent));
}
.phase-icon {
  font-size: 14px;
}
.phase-count {
  background: var(--bg-input);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--text-dim);
}
.phase-tab.active .phase-count {
  background: color-mix(in srgb, var(--tab-color, var(--accent)) 25%, transparent);
  color: var(--tab-color, var(--accent));
}

/* Anim controls */
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
  transition: all 0.15s;
}
.ctrl-btn:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: rgba(255,255,255,0.2);
}
.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.play-btn {
  font-size: 13px;
  gap: 6px;
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
  cursor: pointer;
  box-shadow: 0 0 6px rgba(99,179,237,0.5);
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
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

/* Layout */
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

/* Левая панель: Инфо */
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
  gap: 18px;
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
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.step-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.step-desc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step-desc p {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-line;
}

/* Таблица расстояний */
.table-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.table-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
}

.dijkstra-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.dijkstra-table th, .dijkstra-table td {
  padding: 10px;
  text-align: center;
  border: 1px solid var(--border);
}

.dijkstra-table th {
  background: var(--bg-card2);
  color: var(--text-secondary);
  font-weight: 600;
}

.dijkstra-table th.is-current {
  background: rgba(246,173,85,0.15) !important;
  color: var(--accent-nw) !important;
}

.dijkstra-table th.is-relaxed-target {
  background: rgba(44,182,125,0.15) !important;
  color: var(--accent3) !important;
}

.row-label {
  text-align: left;
  background: var(--bg-card2);
  font-weight: 600;
  color: var(--text-dim);
  width: 120px;
}

.dijkstra-table td.is-visited {
  color: var(--accent3);
  font-weight: 600;
}

.dijkstra-table td.is-current {
  background: rgba(246,173,85,0.06);
  border-color: var(--accent-nw);
  color: var(--accent-nw);
  font-weight: 700;
}

.dijkstra-table td.is-relaxed-target {
  background: rgba(44,182,125,0.06);
  color: var(--accent3);
}

.val-updated {
  animation: flash-update 1s ease;
  font-weight: 700;
}

@keyframes flash-update {
  0% { background: rgba(44,182,125,0.3); }
  100% { background: transparent; }
}

/* Очередь */
.queue-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-card2);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-top: auto;
}

.queue-stat {
  display: flex;
  align-items: center;
  gap: 12px;
}
.q-label {
  font-size: 12px;
  color: var(--text-secondary);
  width: 140px;
  font-weight: 500;
}

.node-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-chip {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.chip-green {
  background: rgba(44,182,125,0.12);
  border: 1px solid rgba(44,182,125,0.2);
  color: var(--accent3);
}

.chip-blue {
  background: rgba(99,179,237,0.12);
  border: 1px solid rgba(99,179,237,0.2);
  color: var(--accent);
}

.empty-list {
  color: var(--text-dim);
  font-size: 12px;
}

/* Правая панель: Граф */
.step-visual-pane {
  padding: 24px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.pane-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
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
  vertical-align: middle;
}
.bg-green { background: var(--accent3); }
.bg-yellow { background: var(--accent-nw); }
.bg-blue { background: var(--accent); }

.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.graph-svg {
  width: 100%;
  height: 100%;
  max-height: 400px;
  display: block;
}

.glow-ring {
  animation: node-pulse 2s infinite ease-in-out;
  transform-origin: center;
}

@keyframes node-pulse {
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 0.3; }
}

.edge-line {
  transition: stroke 0.3s, stroke-width 0.3s;
}

/* Анимация перехода */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to  { opacity: 0; transform: translateY(-6px); }
</style>
