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
            <span class="brand-title">Транспортные задачи</span>
            <span class="brand-sub">Оптимизация перевозок</span>
          </div>
        </div>

        <!-- Вкладки -->
        <nav class="task-tabs">
          <button
            v-for="tab in taskTabs"
            :key="tab.id"
            :id="`tab-${tab.id}`"
            class="task-tab"
            :class="{ active: activeTask === tab.id, done: tab.id !== 1 }"
            @click="activeTask = tab.id"
          >
            <span class="tab-num">{{ tab.id }}</span>
            <span class="tab-label">{{ tab.label }}</span>
            <span v-if="tab.id !== 1" class="tab-soon">скоро</span>
          </button>
        </nav>
      </div>
    </header>

    <!-- Основной контент -->
    <main class="app-main">
      <!-- ══ ЗАДАЧА 1: Транспортная задача ══ -->
      <transition name="fade" mode="out-in">
        <div v-if="activeTask === 1" key="task1" class="task-content">
          <div class="task-intro">
            <div class="task-intro-text">
              <h1 class="task-title">Транспортная задача</h1>
              <p class="task-desc">
                Найти оптимальный план перевозок товаров со складов в магазины при минимальной суммарной стоимости.
                Решение: <strong>СЗУ → Метод Фогеля → Метод потенциалов</strong>.
              </p>
            </div>
            <div class="task-legend">
              <div class="legend-item"><span class="dot nw-dot"></span>Сев.-зап. угол</div>
              <div class="legend-item"><span class="dot vogel-dot"></span>Метод Фогеля</div>
              <div class="legend-item"><span class="dot pot-dot"></span>Потенциалы</div>
            </div>
          </div>

          <!-- Ввод данных -->
          <section class="section">
            <div class="section-head">
              <h2 class="section-title">
                <span class="sec-num">1</span> Ввод данных задачи
              </h2>
            </div>
            <TransportMatrix @solve="onSolve" />
          </section>

          <!-- Пошаговое решение -->
          <transition name="fade">
            <section v-if="solution" class="section" id="solution-section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">2</span> Пошаговое решение
                </h2>
                <span class="badge badge-blue">{{ solution.steps.length }} шагов</span>
              </div>
              <StepsViewer :steps="solution.steps" />
            </section>
          </transition>

          <!-- Результаты -->
          <transition name="fade">
            <section v-if="solution" class="section">
              <div class="section-head">
                <h2 class="section-title">
                  <span class="sec-num">3</span> Оптимальный план перевозок
                </h2>
                <span class="badge badge-green">Стоимость: {{ solution.totalCost }}</span>
              </div>
              <SolutionTable :solution="solution" />
            </section>
          </transition>
        </div>

        <!-- ══ ЗАГЛУШКИ ══ -->
        <div v-else :key="`task-${activeTask}`" class="task-content">
          <div class="coming-soon-wrapper">
            <div class="coming-soon-card card">
              <div class="cs-icon">🚧</div>
              <h1 class="cs-title">Задача {{ activeTask }}</h1>
              <p class="cs-sub">{{ taskTabs.find(t => t.id === activeTask)?.label }}</p>
              <p class="cs-desc">Этот раздел находится в разработке.</p>
              <button class="btn btn-secondary" @click="activeTask = 1">← Вернуться к задаче 1</button>
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
import { ref, nextTick } from 'vue'
import TransportMatrix from './components/TransportMatrix.vue'
import SolutionTable from './components/SolutionTable.vue'
import StepsViewer from './components/StepsViewer.vue'
import { solveTransport } from './core/transport'
import type { TransportProblem, TransportSolution, TaskTab } from './core/types'

const activeTask = ref<TaskTab>(1)

const taskTabs = [
  { id: 1 as TaskTab, label: 'Транспортная задача' },
  { id: 2 as TaskTab, label: 'Задача назначений' },
  { id: 3 as TaskTab, label: 'Задача о кратчайшем пути' },
  { id: 4 as TaskTab, label: 'Задача о максимальном потоке' },
]

const solution = ref<TransportSolution | null>(null)

async function onSolve(problem: TransportProblem) {
  solution.value = null
  await nextTick()
  solution.value = solveTransport(problem)
  await nextTick()
  // Прокрутка к секции решения
  const el = document.getElementById('solution-section')
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
</style>
