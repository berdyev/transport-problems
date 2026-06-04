<template>
  <div class="matrix-editor">
    <!-- Размеры задачи -->
    <div class="card dim-card">
      <div class="dim-row">
        <div class="dim-group">
          <label>Количество складов (n)</label>
          <div class="dim-controls">
            <button class="btn btn-ghost dim-btn" @click="changeSuppliers(-1)" :disabled="nSuppliers <= 2">−</button>
            <span class="dim-val">{{ nSuppliers }}</span>
            <button class="btn btn-ghost dim-btn" @click="changeSuppliers(1)" :disabled="nSuppliers >= 8">+</button>
          </div>
        </div>
        <div class="dim-divider"></div>
        <div class="dim-group">
          <label>Количество магазинов (m)</label>
          <div class="dim-controls">
            <button class="btn btn-ghost dim-btn" @click="changeConsumers(-1)" :disabled="nConsumers <= 2">−</button>
            <span class="dim-val">{{ nConsumers }}</span>
            <button class="btn btn-ghost dim-btn" @click="changeConsumers(1)" :disabled="nConsumers >= 8">+</button>
          </div>
        </div>
        <div class="dim-actions">
          <button class="btn btn-ghost" @click="fillExample">Пример</button>
          <button class="btn btn-ghost" @click="fillRandom">Случайные</button>
          <button class="btn btn-ghost" @click="clearAll">Очистить</button>
        </div>
      </div>
    </div>

    <!-- Матрица -->
    <div class="card matrix-card">
      <div class="matrix-header">
        <div class="mh-corner">
          <span>C<sub>ij</sub></span>
        </div>
        <div v-for="j in nConsumers" :key="`mh-${j}`" class="mh-consumer">
          <span class="col-label consumer-label">М{{ j }}</span>
        </div>
        <div class="mh-supply-head">
          <span>Запас (a<sub>i</sub>)</span>
        </div>
      </div>

      <div v-for="(row, i) in costs" :key="`row-${i}`" class="matrix-row">
        <div class="row-label-cell">
          <span class="row-label supplier-label">С{{ i + 1 }}</span>
        </div>
        <div v-for="(_, j) in row" :key="`cell-${i}-${j}`" class="matrix-cell">
          <input
            :id="`cost-${i}-${j}`"
            type="number"
            min="0"
            class="input-num cost-input"
            v-model.number="costs[i][j]"
            placeholder="0"
          />
        </div>
        <div class="supply-cell">
          <input
            :id="`supply-${i}`"
            type="number"
            min="0"
            class="input-num supply-input"
            v-model.number="supply[i]"
            placeholder="0"
          />
        </div>
      </div>

      <!-- Потребности -->
      <div class="demand-row">
        <div class="demand-label-cell">
          <span class="text-dim small-label">Потребность (b<sub>j</sub>)</span>
        </div>
        <div v-for="(_, j) in nConsumers" :key="`dem-${j}`" class="demand-cell">
          <input
            :id="`demand-${j}`"
            type="number"
            min="0"
            class="input-num demand-input"
            v-model.number="demand[j]"
            placeholder="0"
          />
        </div>
        <div class="balance-cell">
          <div class="balance-indicator" :class="balanceClass">
            <span>{{ balanceLabel }}</span>
            <span class="balance-diff" v-if="balanceDiff !== 0">{{ balanceDiff > 0 ? '+' : '' }}{{ balanceDiff }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Кнопка решить -->
    <div class="solve-row">
      <div class="solve-info" v-if="validationError">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ validationError }}
      </div>
      <button
        id="solve-btn"
        class="btn btn-primary solve-btn"
        :disabled="!!validationError || solving"
        @click="solve"
      >
        <svg v-if="!solving" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span v-if="solving" class="spinner"></span>
        {{ solving ? 'Решаем...' : 'Решить задачу' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TransportProblem } from '../core/types'

const emit = defineEmits<{
  solve: [problem: TransportProblem]
}>()

const nSuppliers = ref(3)
const nConsumers = ref(4)
const solving = ref(false)

const costs = ref<number[][]>(createMatrix(3, 4))
const supply = ref<number[]>([0, 0, 0])
const demand = ref<number[]>([0, 0, 0, 0])

function createMatrix(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array(m).fill(0))
}

function changeSuppliers(delta: number) {
  const next = nSuppliers.value + delta
  if (next < 2 || next > 8) return
  if (delta > 0) {
    costs.value.push(new Array(nConsumers.value).fill(0))
    supply.value.push(0)
  } else {
    costs.value.pop()
    supply.value.pop()
  }
  nSuppliers.value = next
}

function changeConsumers(delta: number) {
  const next = nConsumers.value + delta
  if (next < 2 || next > 8) return
  if (delta > 0) {
    costs.value.forEach(row => row.push(0))
    demand.value.push(0)
  } else {
    costs.value.forEach(row => row.pop())
    demand.value.pop()
  }
  nConsumers.value = next
}

// Баланс
const totalSupply = computed(() => supply.value.reduce((a, b) => a + (b || 0), 0))
const totalDemand = computed(() => demand.value.reduce((a, b) => a + (b || 0), 0))
const balanceDiff = computed(() => totalSupply.value - totalDemand.value)

const balanceClass = computed(() => {
  if (totalSupply.value === 0 && totalDemand.value === 0) return 'balance-empty'
  if (balanceDiff.value === 0) return 'balance-ok'
  return 'balance-warn'
})

const balanceLabel = computed(() => {
  if (totalSupply.value === 0 && totalDemand.value === 0) return '—'
  if (balanceDiff.value === 0) return `∑=${totalSupply.value} ✓`
  if (balanceDiff.value > 0) return `Избыток`
  return `Дефицит`
})

const validationError = computed(() => {
  if (totalSupply.value <= 0) return 'Введите запасы складов'
  if (totalDemand.value <= 0) return 'Введите потребности магазинов'
  if (supply.value.some(s => !s || s <= 0)) return 'Все запасы должны быть > 0'
  if (demand.value.some(d => !d || d <= 0)) return 'Все потребности должны быть > 0'
  const hasNegCost = costs.value.some(row => row.some(c => c < 0))
  if (hasNegCost) return 'Стоимости не могут быть отрицательными'
  return null
})

function fillExample() {
  nSuppliers.value = 3
  nConsumers.value = 4
  costs.value = [
    [2, 3, 1, 5],
    [7, 3, 4, 6],
    [8, 5, 2, 7],
  ]
  supply.value = [120, 80, 80]
  demand.value = [150, 70, 60, 80] // спрос меньше запаса — несбалансированная
}

function fillRandom() {
  const n = nSuppliers.value, m = nConsumers.value
  const rand = (max: number) => Math.floor(Math.random() * max) + 1
  costs.value = Array.from({ length: n }, () =>
    Array.from({ length: m }, () => rand(15))
  )
  const totalD = rand(200) + 100
  const rawD = Array.from({ length: m }, () => rand(50) + 10)
  const sumD = rawD.reduce((a, b) => a + b, 0)
  demand.value = rawD.map(d => Math.round(d / sumD * totalD))
  demand.value[m - 1] = totalD - demand.value.slice(0, m - 1).reduce((a, b) => a + b, 0)

  const totalS = totalD + rand(20) - 10
  const rawS = Array.from({ length: n }, () => rand(50) + 10)
  const sumS = rawS.reduce((a, b) => a + b, 0)
  supply.value = rawS.map(s => Math.round(s / sumS * totalS))
  supply.value[n - 1] = totalS - supply.value.slice(0, n - 1).reduce((a, b) => a + b, 0)
  if (supply.value[n - 1] <= 0) supply.value[n - 1] = 10
}

function clearAll() {
  costs.value = createMatrix(nSuppliers.value, nConsumers.value)
  supply.value = new Array(nSuppliers.value).fill(0)
  demand.value = new Array(nConsumers.value).fill(0)
}

async function solve() {
  if (validationError.value) return
  solving.value = true
  await new Promise(r => setTimeout(r, 50))
  emit('solve', {
    supply: supply.value.map(Number),
    demand: demand.value.map(Number),
    costs: costs.value.map(row => row.map(Number)),
  })
  solving.value = false
}
</script>

<style scoped>
.matrix-editor { display: flex; flex-direction: column; gap: 16px; }

/* Dim card */
.dim-card { padding: 16px 20px; }
.dim-row {
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
}
.dim-group { display: flex; flex-direction: column; gap: 6px; }
.dim-group label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.dim-controls { display: flex; align-items: center; gap: 12px; }
.dim-btn { padding: 4px 14px; font-size: 18px; line-height: 1; }
.dim-val { font-size: 22px; font-weight: 700; color: var(--accent); min-width: 32px; text-align: center; }
.dim-divider { width: 1px; height: 40px; background: var(--border); }
.dim-actions { display: flex; gap: 8px; margin-left: auto; }

/* Matrix card */
.matrix-card { padding: 20px; overflow-x: auto; }

.matrix-header {
  display: grid;
  grid-template-columns: 60px repeat(v-bind(nConsumers), minmax(64px, 1fr)) 100px;
  gap: 6px; margin-bottom: 6px;
}
.mh-corner { display: flex; align-items: center; justify-content: center; }
.mh-corner span { font-size: 13px; color: var(--text-dim); font-style: italic; }
.mh-consumer { display: flex; justify-content: center; }
.mh-supply-head { display: flex; justify-content: center; align-items: center; }
.mh-supply-head span { font-size: 12px; color: var(--text-secondary); }

.matrix-row {
  display: grid;
  grid-template-columns: 60px repeat(v-bind(nConsumers), minmax(64px, 1fr)) 100px;
  gap: 6px; margin-bottom: 6px;
}

.row-label-cell { display: flex; align-items: center; justify-content: center; }
.demand-row {
  display: grid;
  grid-template-columns: 60px repeat(v-bind(nConsumers), minmax(64px, 1fr)) 100px;
  gap: 6px; margin-top: 4px; border-top: 1px solid var(--border); padding-top: 10px;
}
.demand-label-cell { display: flex; align-items: center; justify-content: center; }
.small-label { font-size: 11px; text-align: center; line-height: 1.3; }
.text-dim { color: var(--text-dim); }

.matrix-cell { display: flex; }
.demand-cell { display: flex; }
.supply-cell { display: flex; }

.col-label, .row-label { font-size: 13px; font-weight: 600; }
.consumer-label { color: var(--accent-vogel); }
.supplier-label { color: var(--accent-nw); }

.cost-input { background: var(--bg-input); }
.supply-input { background: rgba(246,173,85,0.08); border-color: rgba(246,173,85,0.2); }
.demand-input { background: rgba(159,122,234,0.08); border-color: rgba(159,122,234,0.2); }

/* Balance indicator */
.balance-cell { display: flex; align-items: center; justify-content: center; }
.balance-indicator {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;
}
.balance-empty { background: transparent; color: var(--text-dim); }
.balance-ok { background: rgba(44,182,125,0.12); color: var(--accent3); }
.balance-warn { background: rgba(246,173,85,0.12); color: var(--accent-nw); }
.balance-diff { font-size: 11px; opacity: 0.8; }

/* Solve row */
.solve-row { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
.solve-info { display: flex; align-items: center; gap: 8px; color: #fc8181; font-size: 13px; }
.solve-btn { padding: 12px 32px; font-size: 15px; }
.solve-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

/* Spinner */
.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
