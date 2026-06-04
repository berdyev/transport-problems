<template>
  <div class="plan-table-scroll">
    <table class="plan-table">
      <thead>
        <tr>
          <th class="th-corner"></th>
          <th v-for="(_, j) in plan[0]" :key="`h-${j}`" :class="`th-col-${color}`">
            М{{ j + 1 }}<br/><small>b={{ demand[j] }}</small>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in plan" :key="`r-${i}`">
          <td :class="`td-row-${color}`">С{{ i + 1 }}<br/><small>a={{ supply[i] }}</small></td>
          <td
            v-for="(val, j) in row"
            :key="`c-${i}-${j}`"
            class="td-cell"
            :class="{ 'cell-active': val > 0 }"
          >
            <div class="cell-inner">
              <span class="cell-cost">{{ costs[i][j] }}</span>
              <span class="cell-amount" :class="`amount-${color}`">{{ val > 0 ? val : '' }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  plan: number[][]
  costs: number[][]
  supply: number[]
  demand: number[]
  color: 'nw' | 'vogel' | 'opt'
}>()
</script>

<style scoped>
.plan-table-scroll { overflow-x: auto; }
.plan-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.plan-table th, .plan-table td { border: 1px solid var(--border); padding: 6px 8px; text-align: center; }

.th-corner { background: var(--bg-card2); }
.th-col-nw    { background: rgba(246,173,85,0.08);  color: var(--phase-nw);    font-weight: 600; }
.th-col-vogel { background: rgba(159,122,234,0.08); color: var(--phase-vogel); font-weight: 600; }
.th-col-opt   { background: rgba(44,182,125,0.08);  color: var(--phase-result);font-weight: 600; }

.td-row-nw    { background: rgba(246,173,85,0.06);  color: var(--phase-nw);    font-weight: 600; white-space: nowrap; }
.td-row-vogel { background: rgba(159,122,234,0.06); color: var(--phase-vogel); font-weight: 600; white-space: nowrap; }
.td-row-opt   { background: rgba(44,182,125,0.06);  color: var(--phase-result);font-weight: 600; white-space: nowrap; }

.td-cell { background: var(--bg-card2); }
.cell-active { background: rgba(99,179,237,0.05); }

.cell-inner { position: relative; min-width: 40px; min-height: 34px; display: flex; align-items: center; justify-content: center; }
.cell-cost { position: absolute; top: 1px; right: 3px; font-size: 10px; color: var(--text-dim); }
.cell-amount { font-weight: 700; font-size: 14px; }
.amount-nw    { color: var(--phase-nw); }
.amount-vogel { color: var(--phase-vogel); }
.amount-opt   { color: var(--phase-result); }

small { font-size: 10px; color: var(--text-dim); display: block; }
</style>
