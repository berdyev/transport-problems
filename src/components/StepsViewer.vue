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
          <div class="step-phase-badge" :style="{ background: phaseColor(currentStep.phase) + '22', color: phaseColor(currentStep.phase) }">
            {{ phaseLabel(currentStep.phase) }}
          </div>
          <h3 class="step-title">{{ currentStep.title }}</h3>
        </div>

        <!-- Описание -->
        <div class="step-desc">
          <p v-for="(line, li) in currentStep.description.split('\n')" :key="li">{{ line }}</p>
        </div>

        <!-- Таблица плана -->
        <div v-if="currentStep.table" class="step-table-wrap">
          <div class="step-table-scroll">
            <table class="step-table">
              <thead>
                <tr>
                  <th class="th-corner">—</th>
                  <th v-for="j in currentStep.table[0].length" :key="`h-${j}`" class="th-consumer">
                    М{{ j }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in currentStep.table" :key="`r-${i}`">
                  <td class="td-supplier">С{{ i + 1 }}</td>
                  <td
                    v-for="(val, j) in row"
                    :key="`c-${i}-${j}`"
                    class="td-cell"
                    :class="{
                      'cell-positive': val > 0,
                      'cell-highlight': isHighlighted(i, j),
                      'cell-zero': val === 0
                    }"
                  >
                    <span class="cell-val">{{ val > 0 ? val : (isHighlighted(i, j) ? '◉' : '·') }}</span>
                    <span
                      v-if="currentStep.highlight && isHighlighted(i, j)"
                      class="cell-sign"
                      :style="{ color: highlightSign(i, j) }"
                    >
                      {{ highlightSign(i, j) }}
                    </span>
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
import type { SolveStep, StepPhase } from '../core/types'

const props = defineProps<{
  steps: SolveStep[]
}>()

type PhaseTabId = StepPhase | 'all'

const phaseTabs: { id: PhaseTabId; label: string; icon: string; color: string }[] = [
  { id: 'all',        label: t('sv1.all'),        icon: '📋', color: '#a0aec0' },
  { id: 'balance',    label: t('sv1.balance'),    icon: '⚖️', color: '#a0aec0' },
  { id: 'northwest',  label: t('sv1.nw'),         icon: '🧭', color: '#f6ad55' },
  { id: 'vogel',      label: t('sv1.vogel'),      icon: '🦅', color: '#9f7aea' },
  { id: 'potentials', label: t('sv1.potentials'), icon: '⚡', color: '#63b3ed' },
  { id: 'result',     label: t('sv1.result'),     icon: '✅', color: '#2cb67d' },
]

const activePhase = ref<PhaseTabId>('all')
const currentStepIdx = ref(0)
const isPlaying = ref(false)
const playSpeed = ref(1000)
let playTimer: ReturnType<typeof setInterval> | null = null

const filteredSteps = computed(() =>
  activePhase.value === 'all'
    ? props.steps
    : props.steps.filter(s => s.phase === activePhase.value)
)

const currentStep = computed(() => filteredSteps.value[currentStepIdx.value] ?? null)

function countByPhase(id: PhaseTabId) {
  if (id === 'all') return props.steps.length
  return props.steps.filter(s => s.phase === id).length
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

watch(activePhase, () => { currentStepIdx.value = 0; isPlaying.value = false; if (playTimer) clearInterval(playTimer) })

onUnmounted(() => { if (playTimer) clearInterval(playTimer) })

function phaseColor(phase: StepPhase): string {
  const map: Record<StepPhase, string> = {
    balance:    '#a0aec0',
    northwest:  '#f6ad55',
    vogel:      '#9f7aea',
    potentials: '#63b3ed',
    result:     '#2cb67d',
  }
  return map[phase] ?? '#a0aec0'
}

function phaseLabel(phase: StepPhase): string {
  const map: Record<StepPhase, string> = {
    balance:    t('sv1.phase_balance'),
    northwest:  t('sv1.phase_nw'),
    vogel:      t('sv1.phase_vogel'),
    potentials: t('sv1.phase_potentials'),
    result:     t('sv1.phase_result'),
  }
  return map[phase] ?? phase
}

function isHighlighted(i: number, j: number): boolean {
  return !!currentStep.value?.highlight?.some(h => h.i === i && h.j === j)
}

function highlightSign(i: number, j: number): string {
  const hl = currentStep.value?.highlight
  if (!hl) return ''
  const idx = hl.findIndex(h => h.i === i && h.j === j)
  if (idx === -1) return ''
  return idx % 2 === 0 ? '+' : '−'
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
.step-desc p { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

/* Step table */
.step-table-wrap { overflow: hidden; border-radius: 12px; border: 1px solid var(--border); }
.step-table-scroll { overflow-x: auto; }

.step-table { width: 100%; border-collapse: collapse; }
.step-table th, .step-table td { padding: 10px 14px; text-align: center; border: 1px solid var(--border); font-size: 14px; }
.th-corner { background: var(--bg-card2); color: var(--text-dim); font-weight: 600; }
.th-consumer { background: rgba(159,122,234,0.08); color: var(--accent-vogel); font-weight: 600; }
.td-supplier { background: rgba(246,173,85,0.08); color: var(--accent-nw); font-weight: 600; }

.td-cell { background: var(--bg-card2); position: relative; transition: background 0.3s; }
.cell-positive { background: rgba(99,179,237,0.06); }
.cell-highlight {
  background: rgba(99,179,237,0.18) !important;
  box-shadow: inset 0 0 0 2px rgba(99,179,237,0.6);
  animation: pulse-cell 0.8s ease infinite alternate;
}
.cell-zero .cell-val { color: var(--text-dim); }

.cell-val { font-weight: 600; }
.cell-sign {
  position: absolute; top: 2px; right: 4px;
  font-size: 11px; font-weight: 700;
}

@keyframes pulse-cell {
  from { background: rgba(99,179,237,0.12); }
  to   { background: rgba(99,179,237,0.28); }
}

/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to  { opacity: 0; transform: translateY(-6px); }
</style>
