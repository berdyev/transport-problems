<template>
  <div class="steps-viewer">
    <!-- Фазы / Фильтр -->
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

    <!-- Текущий шаг -->
    <transition name="fade" mode="out-in">
      <div class="step-card card" :key="currentStepIdx" v-if="currentStep">
        <!-- Заголовок шага -->
        <div class="step-header">
          <div class="step-phase-badge" :style="{ background: phaseColor(currentStep) + '22', color: phaseColor(currentStep) }">
          {{ currentStep.stepIndex === 0 ? t('sv2.prepare') : currentStep.stepIndex === steps.length - 1 ? t('sv2.final') : `${t('sv2.edge_n')} ${currentStep.stepIndex}` }}
          </div>
          <h3 class="step-title">{{ currentStep.title }}</h3>
        </div>

        <!-- Описание -->
        <div class="step-desc">
          <p v-for="(line, li) in currentStep.description.split('\n')" :key="li">{{ line }}</p>
        </div>

        <!-- Список выбранных рёбер -->
        <div class="current-edges-panel" v-if="formattedEdges.length > 0">
          <span class="edges-title">{{ t('sv2.route_at_step') }}</span>
          <div class="edges-list">
            <template v-for="(edge, idx) in formattedEdges" :key="idx">
              <span class="edge-badge" :class="{ 'last-edge': idx === formattedEdges.length - 1 }">
                {{ edge }}
              </span>
              <span class="edge-arrow" v-if="idx < formattedEdges.length - 1">→</span>
            </template>
          </div>
        </div>

        <!-- Таблица матрицы -->
        <div v-if="currentStep.matrix" class="step-table-wrap">
          <div class="step-table-scroll">
            <table class="step-table">
              <thead>
                <tr>
                  <th class="th-corner">C<sub>ij</sub></th>
                  <th
                    v-for="j in n"
                    :key="`h-${j}`"
                    class="th-city"
                    :class="{ 'crossed-col': isColCrossed(j-1) }"
                  >
                    Г{{ j }}
                  </th>
                  <th class="th-reduction">d<sub>i</sub> ({{ t('sv2.col_reduction') }})</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="i in n"
                  :key="`r-${i}`"
                  :class="{ 'crossed-row': isRowCrossed(i-1) }"
                >
                  <td class="td-city" :class="{ 'crossed-row-label': isRowCrossed(i-1) }">Г{{ i }}</td>
                  <td
                    v-for="j in n"
                    :key="`c-${i}-${j}`"
                    class="td-cell"
                    :class="{
                      'cell-diagonal': i === j,
                      'cell-crossed': isRowCrossed(i-1) || isColCrossed(j-1),
                      'cell-selected': isSelectedEdge(i-1, j-1),
                      'cell-blocked': currentStep.matrix[i-1][j-1] === Infinity && i !== j,
                      'cell-zero': currentStep.matrix[i-1][j-1] === 0
                    }"
                  >
                    <span v-if="i === j" class="diagonal-txt">∞</span>
                    <span v-else-if="currentStep.matrix[i-1][j-1] === Infinity" class="infinity-txt">∞</span>
                    <span v-else class="cell-val">
                      {{ currentStep.matrix[i-1][j-1] }}
                      <span v-if="getPenalty(i-1, j-1) !== null" class="penalty-sup" title="Штраф за неиспользование нуля">
                        {{ getPenalty(i-1, j-1) }}
                      </span>
                    </span>
                  </td>
                  <td class="td-row-reduction">
                    <span v-if="currentStep.rowMinima && currentStep.rowMinima[i-1] > 0" class="reduction-val">
                      -{{ currentStep.rowMinima[i-1] }}
                    </span>
                    <span v-else class="reduction-empty">—</span>
                  </td>
                </tr>
                <!-- Строка с вычтенными минимумами по столбцам -->
                <tr class="reduction-row">
                  <td class="td-reduction-label">d<sub>j</sub> ({{ t('sv2.col_col_reduction') }})</td>
                  <td v-for="j in n" :key="`rm-${j}`" class="td-col-reduction">
                    <span v-if="currentStep.colMinima && currentStep.colMinima[j-1] > 0" class="reduction-val">
                      -{{ currentStep.colMinima[j-1] }}
                    </span>
                    <span v-else class="reduction-empty">—</span>
                  </td>
                  <td class="td-total-reduction">
                    H = {{ currentStep.lowerBound }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { t } from '../locale'
import type { TspStep } from '../core/types'

const props = defineProps<{
  steps: TspStep[]
}>()

type PhaseFilterId = 'all' | 'process' | 'result'

const phaseTabs: { id: PhaseFilterId; label: string; icon: string; color: string }[] = [
  { id: 'all',     label: t('sv2.all'),     icon: '📋', color: '#a0aec0' },
  { id: 'process', label: t('sv2.process'), icon: '🔍', color: '#7f5af0' },
  { id: 'result',  label: t('sv2.result'),  icon: '🏆', color: '#2cb67d' },
]

const activePhase = ref<PhaseFilterId>('all')
const currentStepIdx = ref(0)
const isPlaying = ref(false)
const playSpeed = ref(1000)
let playTimer: ReturnType<typeof setInterval> | null = null

const filteredSteps = computed(() => {
  if (activePhase.value === 'all') return props.steps
  if (activePhase.value === 'process') {
    return props.steps.filter((s, idx) => idx > 0 && idx < props.steps.length - 1)
  }
  // result
  return [props.steps[props.steps.length - 1]]
})

const currentStep = computed<TspStep | null>(() => filteredSteps.value[currentStepIdx.value] ?? null)

const n = computed(() => currentStep.value?.matrix.length ?? 0)

const formattedEdges = computed(() => {
  if (!currentStep.value) return []
  return currentStep.value.currentPath.map(e => `Г${e.i + 1} → Г${e.j + 1}`)
})

function countByPhase(id: PhaseFilterId): number {
  if (id === 'all') return props.steps.length
  if (id === 'process') return Math.max(0, props.steps.length - 2)
  return 1 // Результат всегда один шаг
}

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

function phaseColor(step: TspStep): string {
  if (step.stepIndex === 0) return '#a0aec0'
  if (step.stepIndex === props.steps.length - 1) return '#2cb67d'
  return '#7f5af0'
}

function isRowCrossed(idx: number): boolean {
  return !!currentStep.value?.crossedRows.includes(idx)
}

function isColCrossed(idx: number): boolean {
  return !!currentStep.value?.crossedCols.includes(idx)
}

function isSelectedEdge(i: number, j: number): boolean {
  const edge = currentStep.value?.selectedEdge
  return !!(edge && edge.i === i && edge.j === j)
}

function getPenalty(i: number, j: number): number | null {
  return currentStep.value?.penalties?.[i]?.[j] ?? null
}
</script>

<style scoped>
.steps-viewer { display: flex; flex-direction: column; gap: 12px; }

/* Phase tabs */
.phase-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.phase-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 10px;
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-secondary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.phase-tab:hover { border-color: var(--tab-color, var(--accent)); color: var(--tab-color, var(--accent)); }
.phase-tab.active {
  background: color-mix(in srgb, var(--tab-color, var(--accent)) 15%, transparent);
  border-color: var(--tab-color, var(--accent));
  color: var(--tab-color, var(--accent));
}
.phase-icon { font-size: 14px; }
.phase-count {
  background: var(--bg-input); border-radius: 10px;
  padding: 1px 7px; font-size: 11px; color: var(--text-dim);
}
.phase-tab.active .phase-count {
  background: color-mix(in srgb, var(--tab-color, var(--accent)) 25%, transparent);
  color: var(--tab-color, var(--accent));
}

/* Anim controls */
.anim-controls {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px; flex-wrap: wrap;
}
.ctrl-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 7px 12px; background: var(--bg-input);
  border: 1px solid var(--border); border-radius: 8px;
  color: var(--text-secondary); font-size: 16px; cursor: pointer;
  transition: all 0.15s;
}
.ctrl-btn:hover:not(:disabled) { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
.ctrl-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.play-btn { font-size: 13px; gap: 6px; }
.play-btn.playing { color: var(--accent3); border-color: var(--accent3); }

.progress-wrap { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
.progress-slider {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
  background: var(--bg-input); border-radius: 2px; outline: none; cursor: pointer;
}
.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: var(--accent); cursor: pointer; box-shadow: 0 0 6px rgba(99,179,237,0.5);
}
.progress-label { font-size: 11px; color: var(--text-dim); text-align: center; }

.anim-sep { width: 1px; height: 28px; background: var(--border); }
.speed-select {
  padding: 7px 10px; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text-secondary); font-family: inherit; font-size: 12px;
  cursor: pointer;
}

/* Step card */
.step-card { display: flex; flex-direction: column; gap: 14px; }
.step-header { display: flex; align-items: center; gap: 12px; }
.step-phase-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap;
}
.step-title { font-size: 17px; font-weight: 700; color: var(--text-primary); }

.step-desc { display: flex; flex-direction: column; gap: 4px; }
.step-desc p { font-size: 14px; color: var(--text-secondary); line-height: 1.6; white-space: pre-line; }

/* Current path panel */
.current-edges-panel {
  background: var(--bg-card2); border: 1px solid var(--border);
  padding: 12px 16px; border-radius: var(--radius-sm);
  display: flex; flex-direction: column; gap: 8px;
}
.edges-title { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.edges-list { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.edge-badge {
  padding: 4px 10px; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; font-size: 13px; font-weight: 700; color: var(--text-primary);
}
.edge-badge.last-edge {
  background: color-mix(in srgb, var(--accent2) 20%, transparent);
  border-color: var(--accent2); color: #fff;
  box-shadow: 0 0 10px rgba(127,90,240,0.2);
}
.edge-arrow { color: var(--text-dim); font-weight: 700; }

/* Step table */
.step-table-wrap { overflow: hidden; border-radius: 12px; border: 1px solid var(--border); }
.step-table-scroll { overflow-x: auto; }

.step-table { width: 100%; border-collapse: collapse; }
.step-table th, .step-table td { padding: 10px 14px; text-align: center; border: 1px solid var(--border); font-size: 14px; }
.th-corner { background: var(--bg-card2); color: var(--text-dim); font-weight: 600; }
.th-city { background: rgba(127,90,240,0.06); color: var(--accent2); font-weight: 600; }
.td-city { background: rgba(99,179,237,0.06); color: var(--accent); font-weight: 600; }

.td-cell { background: var(--bg-card2); position: relative; transition: background 0.3s; }
.cell-diagonal { background: rgba(255,255,255,0.02); }
.diagonal-txt { color: var(--text-dim); font-size: 16px; font-weight: 600; }
.infinity-txt { color: #f56565; font-size: 16px; font-weight: 600; }

.cell-crossed { opacity: 0.35; background: rgba(0,0,0,0.15) !important; }
.crossed-row { opacity: 0.5; }
.crossed-col { opacity: 0.5; }
.crossed-row-label { text-decoration: line-through; color: var(--text-dim) !important; }

.cell-selected {
  background: color-mix(in srgb, var(--accent2) 30%, var(--bg-card2)) !important;
  box-shadow: inset 0 0 0 2px var(--accent2);
  animation: pulse-cell 1s ease infinite alternate;
}

.cell-zero { color: var(--accent3); font-weight: 700; }

.cell-val { font-weight: 600; display: inline-flex; align-items: center; gap: 4px; justify-content: center; position: relative; }
.penalty-sup {
  font-size: 9px; font-weight: 800; color: var(--accent-nw);
  background: rgba(246,173,85,0.12); padding: 0px 4px; border-radius: 4px;
  vertical-align: super;
}

/* Reduction cells */
.th-reduction { background: rgba(246,173,85,0.04); color: var(--accent-nw); font-size: 12px; font-weight: 600; }
.td-row-reduction { background: var(--bg-card2); color: var(--accent-nw); font-weight: 600; }
.reduction-row { border-top: 2px solid var(--border); }
.td-reduction-label { background: var(--bg-card2); color: var(--accent-nw); font-size: 11px; font-weight: 600; }
.td-col-reduction { background: var(--bg-card2); color: var(--accent-nw); font-weight: 600; }
.td-total-reduction { background: color-mix(in srgb, var(--accent3) 12%, var(--bg-card2)); color: var(--accent3); font-weight: 700; font-size: 13px; }

.reduction-val { color: var(--accent-nw); }
.reduction-empty { color: var(--text-dim); }

@keyframes pulse-cell {
  from { background: color-mix(in srgb, var(--accent2) 15%, var(--bg-card2)); }
  to   { background: color-mix(in srgb, var(--accent2) 35%, var(--bg-card2)); }
}

/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to  { opacity: 0; transform: translateY(-6px); }
</style>
