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

// ============================================================
// Типы для задачи коммивояжера (TSP)
// ============================================================

export interface TspProblem {
  matrix: number[][]
}

export interface TspStep {
  stepIndex: number
  title: string
  description: string
  matrix: number[][]
  crossedRows: number[]
  crossedCols: number[]
  penalties?: (number | null)[][]
  rowMinima?: number[]
  colMinima?: number[]
  selectedEdge?: { i: number; j: number; penalty: number } | null
  currentPath: { i: number; j: number }[]
  lowerBound: number
}

export interface TspSolution {
  edges: { i: number; j: number }[]
  path: number[]
  totalCost: number
  steps: TspStep[]
}

