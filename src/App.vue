<template>
  <div class="app-layout">
    <!-- Шапка -->
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">{{ t('app.title') }}</span>
            <span class="brand-sub">{{ t('app.subtitle') }}</span>
          </div>
        </div>

        <!-- Вкладки -->
        <nav class="task-tabs">
          <button
            v-for="tab in taskTabs"
            :key="tab.id"
            :id="`tab-${tab.id}`"
            class="task-tab"
            :class="{ active: activeTask === tab.id, done: tab.id === 1 || tab.id === 2 || tab.id === 3 || tab.id === 4 }"
            @click="activeTask = tab.id"
          >
            <span class="tab-num">{{ tab.id }}</span>
            <span class="tab-label">{{ t(`tab.${tab.id}` as any) }}</span>
            <span v-if="tab.id !== 1 && tab.id !== 2 && tab.id !== 3 && tab.id !== 4" class="tab-soon">{{ t('tab.soon') }}</span>
          </button>
        </nav>

        <!-- Переключатель языка -->
        <div class="lang-switcher">
          <button
            class="lang-btn"
            :class="{ active: currentLocale === 'ru' }"
            @click="setLocale('ru')"
            title="Русский"
          >RU</button>
          <span class="lang-sep">|</span>
          <button
            class="lang-btn"
            :class="{ active: currentLocale === 'tkm' }"
            @click="setLocale('tkm')"
            title="Türkmençe"
          >TKM</button>
        </div>
      </div>
    </header>

    <!-- Основной контент -->
    <main class="app-main">
      <!-- ══ ЗАДАЧА 1: Транспортная задача ══ -->
      <transition name="fade" mode="out-in">
        <div v-if="activeTask === 1" key="task1" class="task-content">
          <div class="task-intro">
            <div class="task-intro-text">
              <h1 class="task-title">{{ t('task1.title') }}</h1>
              <p class="task-desc">
                {{ t('task1.desc') }}
              </p>
            </div>
            <div class="task-legend">
              <div class="legend-item"><span class="dot nw-dot"></span>{{ t('task1.legend.nw') }}</div>
              <div class="legend-item"><span class="dot vogel-dot"></span>{{ t('task1.legend.vogel') }}</div>
              <div class="legend-item"><span class="dot pot-dot"></span>{{ t('task1.legend.pot') }}</div>
            </div>
          </div>

          <section class="section">
            <div class="section-head">
              <h2 class="section-title">
                <span class="sec-num">1</span> {{ t('task1.sec1') }}
              </h2>
            </div>
            <TransportMatrix @solve="onSolve" />
          </section>

          <transition name="fade">
            <section v-if="solution" class="section" id="solution-section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">2</span> {{ t('task1.sec2') }}
                </h2>
                <span class="badge badge-blue">{{ solution.steps.length }} {{ t('common.steps') }}</span>
              </div>
              <StepsViewer :steps="solution.steps" />
            </section>
          </transition>

          <transition name="fade">
            <section v-if="solution" class="section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">3</span> {{ t('task1.sec3') }}
                </h2>
                <span class="badge badge-green">{{ t('common.cost') }}: {{ solution.totalCost }}</span>
              </div>
              <SolutionTable :solution="solution" />
            </section>
          </transition>
        </div>

        <!-- ══ ЗАДАЧА 2: Задача коммивояжера ══ -->
        <div v-else-if="activeTask === 2" key="task2" class="task-content">
          <div class="task-intro">
            <div class="task-intro-text">
              <h1 class="task-title">{{ t('task2.title') }}</h1>
              <p class="task-desc">
                {{ t('task2.desc') }}
              </p>
            </div>
          </div>

          <section class="section">
            <div class="section-head">
              <h2 class="section-title">
                <span class="sec-num">1</span> {{ t('task2.sec1') }}
              </h2>
            </div>
            <TspMatrix @solve="onTspSolve" />
          </section>

          <transition name="fade">
            <section v-if="tspSolution" class="section" id="tsp-solution-section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">2</span> {{ t('task2.sec2') }}
                </h2>
                <span class="badge badge-purple">{{ tspSolution.steps.length }} {{ t('common.steps') }}</span>
              </div>
              <TspStepsViewer :steps="tspSolution.steps" />
            </section>
          </transition>

          <transition name="fade">
            <section v-if="tspSolution" class="section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">3</span> {{ t('task2.sec3') }}
                </h2>
                <span class="badge badge-green">{{ t('common.path.length') }}: {{ tspSolution.totalCost }}</span>
              </div>
              <div class="card result-card">
                <div class="result-path-display">
                  <span class="result-label">{{ t('task2.path.label') }}</span>
                  <div class="path-sequence">
                    <span v-for="(node, idx) in tspSolution.path" :key="idx" class="path-node">
                      S{{ node + 1 }}
                      <span class="path-arrow" v-if="idx < tspSolution.path.length - 1">→</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </transition>
        </div>

        <!-- ══ ЗАДАЧА 3: Задача о кратчайшем пути ══ -->
        <div v-else-if="activeTask === 3" key="task3" class="task-content">
          <div class="task-intro">
            <div class="task-intro-text">
              <h1 class="task-title">{{ t('task3.title') }}</h1>
              <p class="task-desc">
                {{ t('task3.desc') }}
              </p>
            </div>
          </div>

          <section class="section">
            <div class="section-head">
              <h2 class="section-title">
                <span class="sec-num">1</span> {{ t('task3.sec1') }}
              </h2>
            </div>
            <GraphEditor @solve="onDijkstraSolve" />
          </section>

          <transition name="fade">
            <section v-if="dijkstraResult" class="section" id="dijkstra-solution-section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">2</span> {{ t('task3.sec2') }}
                </h2>
                <span class="badge badge-purple">{{ dijkstraResult.steps.length }} {{ t('common.steps') }}</span>
              </div>
              <DijkstraStepsViewer
                :steps="dijkstraResult.steps"
                :nodes="dijkstraNodes"
                :edges="dijkstraEdges"
                :directed="dijkstraDirected"
              />
            </section>
          </transition>

          <transition name="fade">
            <section v-if="dijkstraResult" class="section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">3</span> {{ t('task3.sec3') }}
                </h2>
              </div>
              <DijkstraResult
                :result="dijkstraResult"
                :nodes="dijkstraNodes"
                :source-id="dijkstraSource"
              />
            </section>
          </transition>
        </div>

        <!-- ══ ЗАДАЧА 4: Задача о максимальном потоке минимальной стоимости ══ -->
        <div v-else-if="activeTask === 4" key="task4" class="task-content">
          <div class="task-intro">
            <div class="task-intro-text">
              <h1 class="task-title">{{ t('task4.title') }}</h1>
              <p class="task-desc">
                {{ t('task4.desc') }} <strong>{{ t('task4.method') }}</strong>.
              </p>
            </div>
          </div>

          <section class="section">
            <div class="section-head">
              <h2 class="section-title">
                <span class="sec-num">1</span> {{ t('task4.sec1') }}
              </h2>
            </div>
            <McfEditor @solve="onMcfSolve" />
          </section>

          <transition name="fade">
            <section v-if="mcfSolution" class="section" id="mcf-solution-section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">2</span> {{ t('task4.sec2') }}
                </h2>
                <span class="badge badge-purple">{{ mcfSolution.steps.length }} {{ t('common.steps') }}</span>
              </div>
              <McfStepsViewer
                :steps="mcfSolution.steps"
                :nodes="mcfNodes"
                :edges="mcfEdges"
              />
            </section>
          </transition>

          <transition name="fade">
            <section v-if="mcfSolution" class="section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">3</span> {{ t('task4.sec3') }}
                </h2>
                <span class="badge badge-green">{{ t('common.cost') }}: {{ mcfSolution.totalCost }}</span>
              </div>
              <McfResult :solution="mcfSolution" />
            </section>
          </transition>
        </div>

        <!-- ══ ЗАГЛУШКИ ══ -->
        <div v-else :key="`task-${activeTask}`" class="task-content">
          <div class="coming-soon-wrapper">
            <div class="coming-soon-card card">
              <div class="cs-icon">🚧</div>
              <h1 class="cs-title">{{ activeTask }}</h1>
              <p class="cs-desc">{{ t('common.coming_soon') }}</p>
              <button class="btn btn-secondary" @click="activeTask = 1">{{ t('common.back') }}</button>
            </div>
          </div>
        </div>
      </transition>
    </main>

    <!-- Фоновые декоративные элементы -->
    <div class="bg-gradient bg-g1"></div>
    <div class="bg-gradient bg-g2"></div>
    <div class="bg-gradient bg-g3"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { t, currentLocale, setLocale } from './locale'
import TransportMatrix from './components/TransportMatrix.vue'
import SolutionTable from './components/SolutionTable.vue'
import StepsViewer from './components/StepsViewer.vue'
import TspMatrix from './components/TspMatrix.vue'
import TspStepsViewer from './components/TspStepsViewer.vue'
import GraphEditor from './components/GraphEditor.vue'
import DijkstraStepsViewer from './components/DijkstraStepsViewer.vue'
import McfEditor from './components/McfEditor.vue'
import McfStepsViewer from './components/McfStepsViewer.vue'
import McfResult from './components/McfResult.vue'

// Теоретические справки
import DijkstraResult from './components/DijkstraResult.vue'
import { solveTransport } from './core/transport'
import { solveTsp } from './core/tsp'
import { dijkstra } from './core/dijkstra'
import { solveMinCostMaxFlow } from './core/mincostflow'
import type { TransportProblem, TransportSolution, TaskTab, TspSolution } from './core/types'
import type { GraphNode, GraphEdge, DijkstraResult as DijkResult } from './core/dijkstra'
import type { McfNode, McfEdge, McfSolution } from './core/mincostflow'

const activeTask = ref<TaskTab>(1)

const taskTabs = [
  { id: 1 as TaskTab },
  { id: 2 as TaskTab },
  { id: 3 as TaskTab },
  { id: 4 as TaskTab },
]

const solution = ref<TransportSolution | null>(null)
const tspSolution = ref<TspSolution | null>(null)
const dijkstraResult = ref<DijkResult | null>(null)
const dijkstraNodes = ref<GraphNode[]>([])
const dijkstraEdges = ref<GraphEdge[]>([])
const dijkstraSource = ref<number>(0)
const dijkstraDirected = ref<boolean>(false)

const mcfSolution = ref<McfSolution | null>(null)
const mcfNodes = ref<McfNode[]>([])
const mcfEdges = ref<McfEdge[]>([])

// Очистка при смене задачи
watch(activeTask, () => {
  solution.value = null
  tspSolution.value = null
  dijkstraResult.value = null
  mcfSolution.value = null
})

async function onSolve(problem: TransportProblem) {
  solution.value = null
  await nextTick()
  solution.value = solveTransport(problem)
  await nextTick()
  // Прокрутка к секции решения
  const el = document.getElementById('solution-section')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function onTspSolve(matrix: number[][]) {
  tspSolution.value = null
  await nextTick()
  tspSolution.value = solveTsp(matrix)
  await nextTick()
  const el = document.getElementById('tsp-solution-section')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function onDijkstraSolve(data: { nodes: GraphNode[]; edges: GraphEdge[]; sourceId: number; directed: boolean }) {
  dijkstraResult.value = null
  dijkstraNodes.value = data.nodes
  dijkstraEdges.value = data.edges
  dijkstraSource.value = data.sourceId
  dijkstraDirected.value = data.directed
  
  await nextTick()
  dijkstraResult.value = dijkstra(data.nodes, data.edges, data.sourceId, data.directed)
  
  await nextTick()
  const el = document.getElementById('dijkstra-solution-section')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function onMcfSolve(data: { nodes: McfNode[]; edges: McfEdge[] }) {
  mcfSolution.value = null
  mcfNodes.value = data.nodes
  mcfEdges.value = data.edges
  
  await nextTick()
  mcfSolution.value = solveMinCostMaxFlow(data.nodes, data.edges)
  
  await nextTick()
  const el = document.getElementById('mcf-solution-section')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
/* ─── Layout ───────────────────────────────────────────── */
.app-layout {
  min-height: 100vh; display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}

/* ─── Header ───────────────────────────────────────────── */
.app-header {
  position: sticky; top: 0; z-index: 100;
  background: rgba(13,15,26,0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  max-width: 1400px; margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; gap: 32px; height: 72px;
}

.brand { display: flex; align-items: center; gap: 12px; }
.brand-icon {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, var(--accent2), var(--accent));
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
}
.brand-title { display: block; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.brand-sub { display: block; font-size: 11px; color: var(--text-dim); }

/* Task tabs */
.task-tabs { display: flex; gap: 4px; }
.task-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 10px;
  background: transparent; border: 1px solid transparent;
  color: var(--text-secondary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.task-tab:hover { color: var(--text-primary); background: var(--bg-card); border-color: var(--border); }
.task-tab.active {
  background: var(--bg-card2);
  border-color: var(--accent);
  color: var(--accent);
}
.tab-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--bg-input); display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.task-tab.active .tab-num { background: var(--accent); color: #fff; }
.tab-soon { font-size: 10px; color: var(--text-dim); background: var(--bg-input); padding: 1px 6px; border-radius: 10px; }

/* ─── Main ─────────────────────────────────────────────── */
.app-main { flex: 1; max-width: 1400px; margin: 0 auto; padding: 32px 24px 64px; width: 100%; }

/* ─── Task intro ───────────────────────────────────────── */
.task-intro {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 28px; flex-wrap: wrap;
}
.task-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
.task-desc { font-size: 14px; color: var(--text-secondary); max-width: 600px; line-height: 1.7; }
.task-legend { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 10px 16px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border); }
.legend-item { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-secondary); }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.nw-dot    { background: var(--phase-nw); }
.vogel-dot { background: var(--phase-vogel); }
.pot-dot   { background: var(--phase-pot); }

/* ─── Sections ─────────────────────────────────────────── */
.task-content { display: flex; flex-direction: column; gap: 28px; }
.section { display: flex; flex-direction: column; gap: 14px; }
.section-head { display: flex; align-items: center; gap: 12px; }
.section-title { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.sec-num {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, var(--accent2), var(--accent));
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* ─── Coming soon ──────────────────────────────────────── */
.coming-soon-wrapper { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
.coming-soon-card { text-align: center; padding: 48px; max-width: 400px; }
.cs-icon { font-size: 56px; margin-bottom: 16px; }
.cs-title { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
.cs-sub { font-size: 16px; color: var(--accent); font-weight: 600; margin-bottom: 12px; }
.cs-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; }

/* ─── BG Gradients ─────────────────────────────────────── */
.bg-gradient {
  position: fixed; pointer-events: none; z-index: 0; border-radius: 50%;
  filter: blur(120px); opacity: 0.05;
}
.bg-g1 { width: 600px; height: 600px; background: var(--accent2); top: -200px; left: -200px; }
.bg-g2 { width: 500px; height: 500px; background: var(--accent); bottom: -200px; right: -200px; }
.bg-g3 { width: 400px; height: 400px; background: var(--accent3); top: 50%; left: 50%; transform: translate(-50%,-50%); }

/* ─── Fade transition ──────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.35s, transform 0.35s; }
.fade-enter-from { opacity: 0; transform: translateY(12px); }
.fade-leave-to  { opacity: 0; transform: translateY(-12px); }

/* TSP Result styles */
.result-card {
  padding: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.result-path-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.result-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}
.path-sequence {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.path-node {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.path-arrow {
  color: var(--text-dim);
  font-size: 16px;
  font-weight: 600;
}

/* ─── Переключатель языка ─── */
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px 6px;
  flex-shrink: 0;
}
.lang-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 5px;
  letter-spacing: 0.05em;
  transition: background 0.2s, color 0.2s;
}
.lang-btn:hover {
  color: var(--text-primary);
  background: rgba(255,255,255,0.06);
}
.lang-btn.active {
  color: var(--accent);
  background: rgba(99,179,237,0.12);
}
.lang-sep {
  color: var(--border);
  font-size: 12px;
  line-height: 1;
  user-select: none;
}
</style>
