<template>
  <div class="matrix-editor">
    <!-- Размеры задачи -->
    <div class="card dim-card">
      <div class="dim-row">
        <div class="dim-group">
          <label>{{ t('tsp.n_cities') }}</label>
          <div class="dim-controls">
            <button class="btn btn-ghost dim-btn" @click="changeCities(-1)" :disabled="nCities <= 3">−</button>
            <span class="dim-val">{{ nCities }}</span>
            <button class="btn btn-ghost dim-btn" @click="changeCities(1)" :disabled="nCities >= 8">+</button>
          </div>
        </div>
        <div class="dim-divider"></div>
        <div class="dim-actions">
          <button class="btn btn-ghost" @click="fillExample">{{ t('tsp.example') }}</button>
          <button class="btn btn-ghost" @click="fillRandom">{{ t('tsp.random') }}</button>
          <button class="btn btn-ghost" @click="clearAll">{{ t('tsp.clear') }}</button>
        </div>
      </div>
    </div>

    <!-- Матрица -->
    <div class="card matrix-card">
      <div class="matrix-header">
        <div class="mh-corner">
          <span>{{ t('tsp.city') }}</span>
        </div>
        <div v-for="j in nCities" :key="`mh-${j}`" class="mh-consumer">
          <span class="col-label consumer-label">{{ t('tsp.city_prefix') }}{{ j }}</span>
        </div>
      </div>

      <div v-for="i in nCities" :key="`row-${i}`" class="matrix-row">
        <div class="row-label-cell">
          <span class="row-label supplier-label">{{ t('tsp.city_prefix') }}{{ i }}</span>
        </div>
        <div v-for="j in nCities" :key="`cell-${i}-${j}`" class="matrix-cell">
          <input
            v-if="i !== j"
            :id="`cost-${i-1}-${j-1}`"
            type="number"
            min="1"
            class="input-num cost-input"
            v-model.number="matrix[i-1][j-1]"
            placeholder="0"
          />
          <div v-else class="diagonal-cell">∞</div>
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
        {{ solving ? t('tsp.solving') : t('tsp.solve') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from '../locale'
import { getTspExample } from '../core/tsp'

const emit = defineEmits<{
  solve: [matrix: number[][]]
}>()

const nCities = ref(5)
const solving = ref(false)

const matrix = ref<number[][]>(createMatrix(5))

// Инициализация дефолтной матрицы
fillExample()

function createMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? Infinity : 0))
  )
}

function changeCities(delta: number) {
  const next = nCities.value + delta
  if (next < 3 || next > 8) return

  const newMatrix = createMatrix(next)
  for (let i = 0; i < next; i++) {
    for (let j = 0; j < next; j++) {
      if (i === j) continue
      // Переносим старые данные, если они помещаются
      if (i < nCities.value && j < nCities.value && matrix.value[i][j] !== Infinity) {
        newMatrix[i][j] = matrix.value[i][j]
      } else {
        newMatrix[i][j] = 0
      }
    }
  }

  matrix.value = newMatrix
  nCities.value = next
}

const validationError = computed(() => {
  for (let i = 0; i < nCities.value; i++) {
    for (let j = 0; j < nCities.value; j++) {
      if (i === j) continue
      const val = matrix.value[i][j]
      if (val === undefined || val === null || (val as any) === '') {
        return t('tsp.err_fill')
      }
      if (isNaN(val) || val <= 0) {
        return t('tsp.err_pos')
      }
    }
  }
  return null
})

function fillExample() {
  nCities.value = 5
  matrix.value = getTspExample()
}

function fillRandom() {
  const n = nCities.value
  const rand = () => Math.floor(Math.random() * 25) + 3 // Случайное расстояние от 3 до 27
  const newMatrix = createMatrix(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        newMatrix[i][j] = Infinity
      } else {
        newMatrix[i][j] = rand()
      }
    }
  }
  matrix.value = newMatrix
}

function clearAll() {
  matrix.value = createMatrix(nCities.value)
}

async function solve() {
  if (validationError.value) return
  solving.value = true
  await new Promise(r => setTimeout(r, 80))
  // Глубокое копирование числовой матрицы для передачи
  emit('solve', matrix.value.map(row => row.map(Number)))
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
  grid-template-columns: 60px repeat(v-bind(nCities), minmax(64px, 1fr));
  gap: 6px; margin-bottom: 6px;
}
.mh-corner { display: flex; align-items: center; justify-content: center; }
.mh-corner span { font-size: 13px; color: var(--text-dim); }
.mh-consumer { display: flex; justify-content: center; }

.matrix-row {
  display: grid;
  grid-template-columns: 60px repeat(v-bind(nCities), minmax(64px, 1fr));
  gap: 6px; margin-bottom: 6px;
}

.row-label-cell { display: flex; align-items: center; justify-content: center; }

.matrix-cell { display: flex; height: 38px; }

.col-label, .row-label { font-size: 13px; font-weight: 600; }
.consumer-label { color: var(--accent-vogel); }
.supplier-label { color: var(--accent-nw); }

.cost-input { background: var(--bg-input); width: 100%; text-align: center; }

.diagonal-cell {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: var(--border); border-radius: var(--radius-sm);
  color: var(--text-dim); font-size: 18px; font-weight: 600;
  user-select: none;
}

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
