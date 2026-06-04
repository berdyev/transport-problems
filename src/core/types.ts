// ============================================================
// Типы для транспортной задачи
// ============================================================

export interface TransportProblem {
  supply: number[]      // Запасы складов a[i]
  demand: number[]      // Потребности магазинов b[j]
  costs: number[][]     // Матрица стоимостей c[i][j]
}

export interface Allocation {
  i: number
  j: number
  amount: number
}

export type StepPhase = 'balance' | 'northwest' | 'vogel' | 'potentials' | 'result'

export interface SolveStep {
  phase: StepPhase
  title: string
  description: string
  table?: number[][]
  highlight?: { i: number; j: number }[]
  detail?: string
}

export interface TransportSolution {
  // Начальный план: СЗУ
  nwPlan: number[][]
  nwCost: number
  // Начальный план: Фогель
  vogelPlan: number[][]
  vogelCost: number
  // Оптимальный план (после метода потенциалов)
  allocations: Allocation[]
  totalCost: number
  plan: number[][]
  // Мета
  steps: SolveStep[]
  isFictitious: boolean
  fictitiousType?: 'supplier' | 'consumer'
  fictitiousIndex?: number
  iterations: number
  isOptimal: boolean
  // Исходные данные (для отображения)
  costs: number[][]
  supply: number[]
  demand: number[]
}

export type TaskTab = 1 | 2 | 3 | 4
