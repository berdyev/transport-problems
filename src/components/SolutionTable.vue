<template>
  <div class="solution-view">
    <!-- Сводка -->
    <div class="summary-grid">
      <div class="summary-card card nw-card">
        <div class="sc-label">Метод СЗУ</div>
        <div class="sc-cost">{{ solution.nwCost }}</div>
        <div class="sc-sub">Начальная стоимость</div>
      </div>
      <div class="arrow-cell">→</div>
      <div class="summary-card card vogel-card">
        <div class="sc-label">Метод Фогеля</div>
        <div class="sc-cost">{{ solution.vogelCost }}</div>
        <div class="sc-sub">Улучшенное начало</div>
      </div>
      <div class="arrow-cell">→</div>
      <div class="summary-card card opt-card">
        <div class="sc-label">Оптимум</div>
        <div class="sc-cost highlight-cost">{{ solution.totalCost }}</div>
        <div class="sc-sub">Метод потенциалов ({{ solution.iterations }} ит.)</div>
      </div>
    </div>

    <!-- Предупреждение о балансировке -->
    <div v-if="solution.isFictitious" class="fictitious-notice card">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>
        Задача была несбалансированной. Добавлен фиктивный
        {{ solution.fictitiousType === 'consumer' ? `магазин М${(solution.fictitiousIndex ?? 0) + 1}` : `склад С${(solution.fictitiousIndex ?? 0) + 1}` }}.
        Перевозки на него в плане не учитываются.
      </span>
    </div>

    <!-- Три плана рядом -->
    <div class="plans-comparison">
      <div class="plan-block card">
        <div class="plan-title nw-title">
          <span class="plan-badge nw-badge">СЗУ</span>
          <span>Северо-западный угол</span>
          <span class="plan-cost">{{ solution.nwCost }}</span>
        </div>
        <div class="plan-table-wrap">
          <PlanTable :plan="solution.nwPlan" :costs="solution.costs" :supply="solution.supply" :demand="solution.demand" color="nw" />
        </div>
      </div>

      <div class="plan-block card">
        <div class="plan-title vogel-title">
          <span class="plan-badge vogel-badge">Фогель</span>
          <span>Метод Фогеля</span>
          <span class="plan-cost">{{ solution.vogelCost }}</span>
        </div>
        <div class="plan-table-wrap">
          <PlanTable :plan="solution.vogelPlan" :costs="solution.costs" :supply="solution.supply" :demand="solution.demand" color="vogel" />
        </div>
      </div>

      <div class="plan-block card opt-block">
        <div class="plan-title opt-title">
          <span class="plan-badge opt-badge">Оптимум ✓</span>
          <span>Метод потенциалов</span>
          <span class="plan-cost opt-cost">{{ solution.totalCost }}</span>
        </div>
        <div class="plan-table-wrap">
          <PlanTable :plan="solution.plan" :costs="solution.costs" :supply="solution.supply" :demand="solution.demand" color="opt" />
        </div>
      </div>
    </div>

    <!-- Таблица перевозок -->
    <div class="card allocation-card">
      <h4 class="alloc-title">Оптимальный план перевозок</h4>
      <table class="alloc-table">
        <thead>
          <tr>
            <th>Маршрут</th>
            <th>Склад → Магазин</th>
            <th>Стоимость</th>
            <th>Объём</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, idx) in solution.allocations" :key="idx">
            <td>{{ idx + 1 }}</td>
            <td>
              <span class="route-from">С{{ a.i + 1 }}</span>
              <span class="route-arrow">→</span>
              <span class="route-to">М{{ a.j + 1 }}</span>
            </td>
            <td>{{ solution.costs[a.i][a.j] }}</td>
            <td class="route-amount">{{ a.amount }}</td>
            <td class="route-subtotal">{{ solution.costs[a.i][a.j] * a.amount }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">Итоговая стоимость</td>
            <td class="total-val">{{ solution.totalCost }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TransportSolution } from '../core/types'
import PlanTable from './PlanTable.vue'

defineProps<{ solution: TransportSolution }>()
</script>

<style scoped>
.solution-view { display: flex; flex-direction: column; gap: 16px; }

/* Summary */
.summary-grid {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.summary-card { flex: 1; min-width: 150px; padding: 16px; text-align: center; }
.arrow-cell { color: var(--text-dim); font-size: 22px; }
.sc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.sc-cost { font-size: 32px; font-weight: 800; margin-bottom: 4px; }
.sc-sub { font-size: 11px; color: var(--text-dim); }
.nw-card .sc-label { color: var(--phase-nw); }
.nw-card .sc-cost { color: var(--phase-nw); }
.vogel-card .sc-label { color: var(--phase-vogel); }
.vogel-card .sc-cost { color: var(--phase-vogel); }
.opt-card { border-color: rgba(44,182,125,0.3); box-shadow: 0 0 20px rgba(44,182,125,0.1); }
.opt-card .sc-label { color: var(--phase-result); }
.highlight-cost { color: var(--phase-result); }

/* Fictitious notice */
.fictitious-notice {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; background: rgba(246,173,85,0.08);
  border-color: rgba(246,173,85,0.3); color: var(--accent-nw);
  font-size: 13px;
}

/* Plans comparison */
.plans-comparison { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.plan-block { padding: 16px; }
.opt-block { border-color: rgba(44,182,125,0.3); }
.plan-title { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 14px; font-weight: 600; }
.plan-cost { margin-left: auto; font-weight: 700; font-size: 16px; }
.plan-badge { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.nw-badge { background: rgba(246,173,85,0.15); color: var(--phase-nw); }
.nw-title { color: var(--phase-nw); }
.vogel-badge { background: rgba(159,122,234,0.15); color: var(--phase-vogel); }
.vogel-title { color: var(--phase-vogel); }
.opt-badge { background: rgba(44,182,125,0.15); color: var(--phase-result); }
.opt-title { color: var(--phase-result); }
.opt-cost { color: var(--phase-result); }

/* Allocation table */
.allocation-card { padding: 20px; }
.alloc-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; color: var(--text-primary); }
.alloc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.alloc-table th { padding: 10px 16px; background: var(--bg-input); color: var(--text-secondary); font-weight: 600; text-align: left; }
.alloc-table td { padding: 10px 16px; border-bottom: 1px solid var(--border); }
.alloc-table tbody tr:hover { background: rgba(255,255,255,0.02); }

.route-from { color: var(--phase-nw); font-weight: 600; }
.route-arrow { margin: 0 6px; color: var(--text-dim); }
.route-to { color: var(--phase-vogel); font-weight: 600; }
.route-amount { color: var(--accent); font-weight: 600; }
.route-subtotal { color: var(--text-primary); font-weight: 600; }

tfoot td { border-top: 2px solid var(--border); padding: 12px 16px; }
.total-label { color: var(--text-secondary); font-weight: 600; }
.total-val { color: var(--phase-result); font-size: 18px; font-weight: 800; }
</style>
