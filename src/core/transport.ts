/**
 * Транспортная задача
 * 1. Метод Северо-Западного угла (СЗУ) — первое начальное решение
 * 2. Метод Фогеля — улучшенное начальное решение
 * 3. Метод потенциалов (MODI) — оптимизация до глобального минимума (с шагами)
 */

import type { TransportProblem, TransportSolution, SolveStep } from './types'
import { currentLocale } from '../locale'

const INF = 1e9

// ─── Вспомогательные ────────────────────────────────────────────────────────

function deepCopy<T>(arr: T[][]): T[][] {
  return arr.map(row => [...row])
}

function sumArr(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function calcCost(plan: number[][], costs: number[][], n: number, m: number): number {
  let total = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      total += plan[i][j] * costs[i][j]
  return total
}

// ─── Балансировка ────────────────────────────────────────────────────────────

function balance(
  supply: number[],
  demand: number[],
  costs: number[][],
  steps: SolveStep[]
): {
  supply: number[]; demand: number[]; costs: number[][]
  fictitious: boolean; fictitiousType?: 'supplier' | 'consumer'; fictitiousIndex?: number
} {
  const totalSupply = sumArr(supply)
  const totalDemand = sumArr(demand)

  const isTkm = currentLocale.value === 'tkm'
  if (totalSupply === totalDemand) {
    steps.push({
      phase: 'balance',
      title: isTkm ? 'Deňagramlylygy barlamak' : 'Проверка баланса',
      description: isTkm ? `Meselä deňagramly: umumy ätiýaçlyklar = umumy islegler = ${totalSupply}` : `Задача сбалансирована: суммарные запасы = суммарные потребности = ${totalSupply}`,
    })
    return { supply: [...supply], demand: [...demand], costs: deepCopy(costs), fictitious: false }
  }

  if (totalSupply > totalDemand) {
    const diff = totalSupply - totalDemand
    const newDemand = [...demand, diff]
    const newCosts = costs.map(row => [...row, 0])
    const idx = demand.length
    steps.push({
      phase: 'balance',
      title: isTkm ? 'Meseläni deňagramlaşdyrmak' : 'Балансировка задачи',
      description: isTkm
        ? `Ätiýaçlyklar (${totalSupply}) > Islegler (${totalDemand}). ${diff} islegli we nolinji daşamak bahasy bolan galp D${idx + 1} dükanyny goşýarys.`
        : `Запасы (${totalSupply}) > Потребности (${totalDemand}). Добавляем фиктивный магазин М${idx + 1} с потребностью ${diff} и нулевой стоимостью перевозки.`,
    })
    return { supply: [...supply], demand: newDemand, costs: newCosts, fictitious: true, fictitiousType: 'consumer', fictitiousIndex: idx }
  } else {
    const diff = totalDemand - totalSupply
    const newSupply = [...supply, diff]
    const newCosts = [...costs.map(row => [...row]), new Array(demand.length).fill(0)]
    const idx = supply.length
    steps.push({
      phase: 'balance',
      title: isTkm ? 'Meseläni deňagramlaşdyrmak' : 'Балансировка задачи',
      description: isTkm
        ? `Islegler (${totalDemand}) > Ätiýaçlyklar (${totalSupply}). ${diff} ätiýaçlykly we nolinji daşamak bahasy bolan galp A${idx + 1} ammaryny goşýarys.`
        : `Потребности (${totalDemand}) > Запасы (${totalSupply}). Добавляем фиктивный склад С${idx + 1} с запасом ${diff} и нулевой стоимостью перевозки.`,
    })
    return { supply: newSupply, demand: [...demand], costs: newCosts, fictitious: true, fictitiousType: 'supplier', fictitiousIndex: idx }
  }
}

// ─── Метод Северо-Западного угла ─────────────────────────────────────────────

export function northWestCorner(
  supply: number[],
  demand: number[],
  steps: SolveStep[]
): number[][] {
  const n = supply.length
  const m = demand.length
  const plan: number[][] = Array.from({ length: n }, () => new Array(m).fill(0))
  const s = [...supply]
  const d = [...demand]

  const isTkm = currentLocale.value === 'tkm'
  steps.push({
    phase: 'northwest',
    title: isTkm ? 'Demirgazyk-Günbatar burç usuly — başlangyç' : 'Метод Северо-Западного угла — старт',
    description: isTkm
      ? 'Matrisanyň ýokarky çep (demirgazyk-günbatar) öýjüginden başlaýarys. Her ädimde mümkin bolan iň uly göwrümi paýlaýarys we saga ýa-da aşak geçýäris.'
      : 'Начинаем с верхней левой (северо-западной) ячейки матрицы. На каждом шаге распределяем максимально возможный объём и переходим вправо или вниз.',
    table: deepCopy(plan),
    highlight: [],
  })

  let i = 0, j = 0
  while (i < n && j < m) {
    const amount = Math.min(s[i], d[j])
    plan[i][j] = amount
    s[i] -= amount
    d[j] -= amount

    steps.push({
      phase: 'northwest',
      title: isTkm ? `DGB: öýjük (A${i + 1}, D${j + 1})` : `СЗУ: ячейка (С${i + 1}, М${j + 1})`,
      description: `x[${i + 1}][${j + 1}] = min(${s[i] + amount}, ${d[j] + amount}) = ${amount}. ` +
        (isTkm ? `A${i + 1} ammarynyň galyndysy: ${s[i]}, D${j + 1} dükanynyň islegi: ${d[j]}.` : `Остаток склада С${i + 1}: ${s[i]}, потребность М${j + 1}: ${d[j]}.`),
      table: deepCopy(plan),
      highlight: [{ i, j }],
    })

    if (s[i] === 0 && d[j] === 0) { i++; j++ }
    else if (s[i] === 0) i++
    else j++
  }

  return plan
}

// ─── Метод Фогеля ────────────────────────────────────────────────────────────

function penalty2min(vals: number[]): number {
  if (vals.length < 2) return 0
  const sorted = [...vals].sort((a, b) => a - b)
  return sorted[1] - sorted[0]
}

export function vogelMethod(
  supply: number[],
  demand: number[],
  costs: number[][],
  steps: SolveStep[]
): number[][] {
  const n = supply.length
  const m = demand.length
  const plan: number[][] = Array.from({ length: n }, () => new Array(m).fill(0))
  const s = [...supply]
  const d = [...demand]
  const doneRows = new Set<number>()
  const doneCols = new Set<number>()

  const isTkm = currentLocale.value === 'tkm'
  steps.push({
    phase: 'vogel',
    title: isTkm ? 'Fogel usuly — başlangyç' : 'Метод Фогеля — старт',
    description: isTkm
      ? 'Her hatar we sütün üçin jerime hasaplaýarys = iki iň kiçi bahanyň arasyndaky tapawut. Iň uly jerimeli hatary/sütüni saýlaýarys we iň kiçi bahaly öýjügi doldurýarys.'
      : 'Для каждой строки и столбца вычисляем штраф = разность между двумя минимальными стоимостями. Выбираем строку/столбец с наибольшим штрафом и заполняем ячейку с минимальной стоимостью.',
    table: deepCopy(plan),
    highlight: [],
  })

  let safetyCounter = 0
  while (doneRows.size < n && doneCols.size < m) {
    safetyCounter++
    if (safetyCounter > 500) break

    // Штрафы строк
    const rowPens: { idx: number; pen: number }[] = []
    for (let i = 0; i < n; i++) {
      if (doneRows.has(i)) continue
      const vals = []
      for (let j = 0; j < m; j++) if (!doneCols.has(j)) vals.push(costs[i][j])
      if (vals.length > 0) rowPens.push({ idx: i, pen: penalty2min(vals) })
    }

    // Штрафы столбцов
    const colPens: { idx: number; pen: number }[] = []
    for (let j = 0; j < m; j++) {
      if (doneCols.has(j)) continue
      const vals = []
      for (let i = 0; i < n; i++) if (!doneRows.has(i)) vals.push(costs[i][j])
      if (vals.length > 0) colPens.push({ idx: j, pen: penalty2min(vals) })
    }

    const maxRow = rowPens.reduce((a, b) => a.pen >= b.pen ? a : b, { idx: -1, pen: -1 })
    const maxCol = colPens.reduce((a, b) => a.pen >= b.pen ? a : b, { idx: -1, pen: -1 })

    let chosenI = -1, chosenJ = -1

    if (maxRow.pen >= maxCol.pen && maxRow.idx !== -1) {
      const i = maxRow.idx
      let minC = INF
      for (let j = 0; j < m; j++) {
        if (!doneCols.has(j) && costs[i][j] < minC) { minC = costs[i][j]; chosenI = i; chosenJ = j }
      }
    } else if (maxCol.idx !== -1) {
      const j = maxCol.idx
      let minC = INF
      for (let i = 0; i < n; i++) {
        if (!doneRows.has(i) && costs[i][j] < minC) { minC = costs[i][j]; chosenI = i; chosenJ = j }
      }
    }

    if (chosenI === -1 || chosenJ === -1) break

    const amount = Math.min(s[chosenI], d[chosenJ])
    plan[chosenI][chosenJ] += amount
    s[chosenI] -= amount
    d[chosenJ] -= amount

    const penSrc = maxRow.pen >= maxCol.pen
      ? (isTkm ? `A${chosenI + 1} hatarynyň jerimesi = ${maxRow.pen} (iň uly)` : `Штраф строки С${chosenI + 1} = ${maxRow.pen} (максимальный)`)
      : (isTkm ? `D${chosenJ + 1} sütüniň jerimesi = ${maxCol.pen} (iň uly)` : `Штраф столбца М${chosenJ + 1} = ${maxCol.pen} (максимальный)`)

    steps.push({
      phase: 'vogel',
      title: isTkm ? `Fogel: öýjük (A${chosenI + 1}, D${chosenJ + 1})` : `Фогель: ячейка (С${chosenI + 1}, М${chosenJ + 1})`,
      description: `${penSrc}. ` +
        (isTkm ? `Iň kiçi baha c[${chosenI + 1}][${chosenJ + 1}] = ${costs[chosenI][chosenJ]}. ` : `Минимальная стоимость c[${chosenI + 1}][${chosenJ + 1}] = ${costs[chosenI][chosenJ]}. `) +
        `x[${chosenI + 1}][${chosenJ + 1}] = min(${s[chosenI] + amount}, ${d[chosenJ] + amount}) = ${amount}.`,
      table: deepCopy(plan),
      highlight: [{ i: chosenI, j: chosenJ }],
    })

    if (s[chosenI] === 0) doneRows.add(chosenI)
    if (d[chosenJ] === 0) doneCols.add(chosenJ)
  }

  return plan
}

// ─── Метод потенциалов (MODI) ─────────────────────────────────────────────────

function computePotentials(
  plan: number[][],
  costs: number[][],
  n: number,
  m: number
): { u: number[]; v: number[] } {
  const u: (number | null)[] = new Array(n).fill(null)
  const v: (number | null)[] = new Array(m).fill(null)
  u[0] = 0

  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (plan[i][j] > 0) {
          if (u[i] !== null && v[j] === null) { v[j] = costs[i][j] - (u[i] as number); changed = true }
          else if (v[j] !== null && u[i] === null) { u[i] = costs[i][j] - (v[j] as number); changed = true }
        }
      }
    }
  }

  for (let i = 0; i < n; i++) if (u[i] === null) u[i] = 0
  for (let j = 0; j < m; j++) if (v[j] === null) v[j] = 0
  return { u: u as number[], v: v as number[] }
}

function findLoop(
  si: number,
  sj: number,
  plan: number[][],
  n: number,
  m: number
): { i: number; j: number }[] | null {
  type Cell = { i: number; j: number }

  function dfs(path: Cell[], horizontal: boolean): Cell[] | null {
    const last = path[path.length - 1]
    const first = path[0]

    if (path.length >= 4) {
      const closes = horizontal ? last.i === first.i : last.j === first.j
      if (closes) return path
    }

    for (let ii = 0; ii < n; ii++) {
      for (let jj = 0; jj < m; jj++) {
        if (plan[ii][jj] === 0 && !(ii === si && jj === sj)) continue
        if (path.some(p => p.i === ii && p.j === jj)) continue
        const connects = horizontal ? ii === last.i : jj === last.j
        if (!connects) continue
        const res = dfs([...path, { i: ii, j: jj }], !horizontal)
        if (res) return res
      }
    }
    return null
  }

  return dfs([{ i: si, j: sj }], true) ?? dfs([{ i: si, j: sj }], false)
}

export function potentialsMethod(
  initialPlan: number[][],
  costs: number[][],
  n: number,
  m: number,
  steps: SolveStep[]
): { plan: number[][]; iterations: number } {
  let plan = deepCopy(initialPlan)
  let iterations = 0

  const isTkm = currentLocale.value === 'tkm'
  steps.push({
    phase: 'potentials',
    title: isTkm ? 'Potensiallar usuly — başlangyç' : 'Метод потенциалов — начало',
    description: isTkm
      ? 'Her iterasiýa üçin: 1) u[i], v[j] potensiallaryny hasaplaýarys, 2) boş öýjükleriň bahalaryny tapýarys δ[i][j] = c[i][j] − u[i] − v[j], 3) eger ähli δ ≥ 0 bolsa — meýilnama optimal; ýogsam täzeden hasaplamak üçin sikl gurýarys.'
      : 'Для каждой итерации: 1) вычисляем потенциалы u[i], v[j], 2) находим оценки свободных клеток δ[i][j] = c[i][j] − u[i] − v[j], 3) если все δ ≥ 0 — план оптимален; иначе строим цикл пересчёта.',
    table: deepCopy(plan),
  })

  while (iterations < 200) {
    iterations++
    const { u, v } = computePotentials(plan, costs, n, m)

    // Оценки свободных клеток
    let minDelta = 0
    let enterI = -1, enterJ = -1
    const deltas: string[] = []

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (plan[i][j] === 0) {
          const d = costs[i][j] - u[i] - v[j]
          if (d < 0) deltas.push(`δ(${i + 1},${j + 1})=${d}`)
          if (d < minDelta) { minDelta = d; enterI = i; enterJ = j }
        }
      }
    }

    const uStr = u.map((x, i) => `u${i + 1}=${x}`).join(', ')
    const vStr = v.map((x, j) => `v${j + 1}=${x}`).join(', ')

    if (enterI === -1) {
      steps.push({
        phase: 'potentials',
        title: isTkm ? `Iterasiýa ${iterations}: Çözgüt optimal ✓` : `Итерация ${iterations}: Решение оптимально ✓`,
        description: isTkm 
          ? `Potensiallar: ${uStr}; ${vStr}.\nÄhli boş öýjükleriň bahalary ≥ 0. Optima ýetildi!`
          : `Потенциалы: ${uStr}; ${vStr}.\nВсе оценки свободных клеток ≥ 0. Оптимум достигнут!`,
        table: deepCopy(plan),
        highlight: [],
      })
      break
    }

    // Строим цикл
    const loop = findLoop(enterI, enterJ, plan, n, m)
    if (!loop || loop.length < 4) {
      steps.push({
        phase: 'potentials',
        title: isTkm ? `Iterasiýa ${iterations}: Bozulma ýagdaýy` : `Итерация ${iterations}: Вырожденный случай`,
        description: isTkm
          ? `Täzeden hasaplamak sikli gurlup bilinmedi. Otrisatel bahalar: ${deltas.join(', ')}.`
          : `Цикл пересчёта не построен. Отрицательные оценки: ${deltas.join(', ')}.`,
        table: deepCopy(plan),
      })
      break
    }

    // Θ = min по нечётным вершинам цикла
    let theta = INF
    for (let k = 1; k < loop.length; k += 2) {
      if (plan[loop[k].i][loop[k].j] < theta) theta = plan[loop[k].i][loop[k].j]
    }

    const loopStr = loop.map((c, k) => `${k % 2 === 0 ? '+' : '−'}(${c.i + 1},${c.j + 1})`).join('→')

    steps.push({
      phase: 'potentials',
      title: isTkm ? `Iterasiýa ${iterations}: Täzeden hasaplamak` : `Итерация ${iterations}: Пересчёт`,
      description: isTkm
        ? `Potensiallar: ${uStr}; ${vStr}.\nIň kiçi baha: δ(A${enterI + 1},D${enterJ + 1}) = ${minDelta} < 0.\nSikl: ${loopStr}. Θ = ${theta}.`
        : `Потенциалы: ${uStr}; ${vStr}.\nМинимальная оценка: δ(С${enterI + 1},М${enterJ + 1}) = ${minDelta} < 0.\nЦикл: ${loopStr}. Θ = ${theta}.`,
      table: deepCopy(plan),
      highlight: loop,
    })

    // Пересчёт
    for (let k = 0; k < loop.length; k++) {
      const { i, j } = loop[k]
      plan[i][j] += k % 2 === 0 ? theta : -theta
    }
  }

  return { plan, iterations }
}

// ─── Главная функция ──────────────────────────────────────────────────────────

export function solveTransport(problem: TransportProblem): TransportSolution {
  const isTkm = currentLocale.value === 'tkm'
  const steps: SolveStep[] = []

  steps.push({
    phase: 'balance',
    title: isTkm ? 'Meseläniň goýluşy' : 'Постановка задачи',
    description: isTkm
      ? `Ammarlar: ${problem.supply.length}, Dükanlar: ${problem.demand.length}. Umumy ätiýaçlyklar: ${sumArr(problem.supply)}, Umumy islegler: ${sumArr(problem.demand)}.`
      : `Складов: ${problem.supply.length}, Магазинов: ${problem.demand.length}. Суммарные запасы: ${sumArr(problem.supply)}, Суммарные потребности: ${sumArr(problem.demand)}.`,
  })

  const { supply, demand, costs, fictitious, fictitiousType, fictitiousIndex } =
    balance(problem.supply, problem.demand, problem.costs, steps)

  const n = supply.length
  const m = demand.length

  // 1. СЗУ
  const nwSteps: SolveStep[] = []
  const nwPlan = northWestCorner(supply, demand, nwSteps)
  const nwCost = calcCost(nwPlan, costs, n, m)
  nwSteps.push({
    phase: 'northwest',
    title: isTkm ? 'Netije: DGB usuly' : 'Итог: Метод СЗУ',
    description: isTkm ? `Başlangyç meýilnama (DGB) gurlupdy. Bahasy: ${nwCost}.` : `Начальный план (СЗУ) построен. Стоимость: ${nwCost}.`,
    table: deepCopy(nwPlan),
    highlight: [],
  })

  // 2. Фогель
  const vogelSteps: SolveStep[] = []
  const vogelPlan = vogelMethod(supply, demand, costs, vogelSteps)
  const vogelCost = calcCost(vogelPlan, costs, n, m)
  vogelSteps.push({
    phase: 'vogel',
    title: isTkm ? 'Netije: Fogel usuly' : 'Итог: Метод Фогеля',
    description: isTkm
      ? `Başlangyç meýilnama (Fogel) gurlupdy. Bahasy: ${vogelCost}. ${vogelCost < nwCost ? `DGB usulyna garanyňda ${nwCost - vogelCost} gowulanma.` : 'Baha DGB usulyna meňzeş.'}`
      : `Начальный план (Фогель) построен. Стоимость: ${vogelCost}. ${vogelCost < nwCost ? `Улучшение на ${nwCost - vogelCost} по сравнению с СЗУ.` : 'Стоимость сравнима с СЗУ.'}`,
    table: deepCopy(vogelPlan),
    highlight: [],
  })

  // 3. Метод потенциалов (от плана Фогеля)
  const potSteps: SolveStep[] = []
  const { plan: optPlan, iterations } = potentialsMethod(vogelPlan, costs, n, m, potSteps)
  const totalCost = calcCost(optPlan, costs, n, m)

  // Все шаги вместе
  steps.push(...nwSteps, ...vogelSteps, ...potSteps)

  const realN = problem.supply.length
  const realM = problem.demand.length

  const allocations = []
  for (let i = 0; i < realN; i++)
    for (let j = 0; j < realM; j++)
      if (optPlan[i][j] > 0)
        allocations.push({ i, j, amount: optPlan[i][j] })

  steps.push({
    phase: 'result',
    title: isTkm ? '✅ Iň oňat daşamagy meýilnamasy' : '✅ Оптимальный план перевозок',
    description: isTkm
      ? `Iň az umumy baha: ${totalCost}.\nDGB: ${nwCost} → Fogel: ${vogelCost} → Iň oňat: ${totalCost}.\nPotensiallar usulynyň iterasiýalary: ${iterations}.`
      : `Минимальная суммарная стоимость: ${totalCost}.\nСЗУ: ${nwCost} → Фогель: ${vogelCost} → Оптимум: ${totalCost}.\nИтераций метода потенциалов: ${iterations}.`,
    table: optPlan.slice(0, realN).map(row => row.slice(0, realM)),
    highlight: [],
  })

  return {
    nwPlan: nwPlan.slice(0, realN).map(row => row.slice(0, realM)),
    nwCost,
    vogelPlan: vogelPlan.slice(0, realN).map(row => row.slice(0, realM)),
    vogelCost,
    allocations,
    totalCost,
    plan: optPlan.slice(0, realN).map(row => row.slice(0, realM)),
    steps,
    isFictitious: fictitious,
    fictitiousType,
    fictitiousIndex,
    iterations,
    isOptimal: true,
    costs: problem.costs,
    supply: problem.supply,
    demand: problem.demand,
  }
}
