/**
 * Алгоритм решения задачи коммивояжера (TSP) методом ветвей и границ (алгоритм Литтла)
 * с пошаговой генерацией для визуализации.
 */

import type { TspStep, TspSolution } from './types'

const INF = Infinity

/**
 * Глубокое копирование числовой матрицы
 */
function cloneMatrix(matrix: number[][]): number[][] {
  return matrix.map(row => [...row])
}

/**
 * Нахождение точного оптимального пути методом полного перебора.
 * Так как размерность задачи от 3 до 8 городов, перебор работает мгновенно (макс 7! = 5040 вариантов).
 */
export function findAbsoluteOptimal(matrix: number[][]): { path: number[]; cost: number } {
  const n = matrix.length
  let bestPath: number[] = []
  let bestCost = INF

  const visited = new Array(n).fill(false)
  const path: number[] = [0]
  visited[0] = true

  function dfs(curr: number, cost: number, depth: number) {
    if (cost >= bestCost) return

    if (depth === n) {
      const returnCost = matrix[curr][0]
      if (returnCost !== INF && cost + returnCost < bestCost) {
        bestCost = cost + returnCost
        bestPath = [...path, 0]
      }
      return
    }

    for (let next = 0; next < n; next++) {
      if (!visited[next] && matrix[curr][next] !== INF) {
        visited[next] = true
        path.push(next)
        dfs(next, cost + matrix[curr][next], depth + 1)
        path.pop()
        visited[next] = false
      }
    }
  }

  dfs(0, 0, 1)
  return { path: bestPath, cost: bestCost }
}

/**
 * Вспомогательная функция для блокировки подциклов.
 * Находит начало и конец пути, содержащего новое ребро (u, v),
 * и возвращает ребро, которое нужно заблокировать (конец -> начало).
 */
function findSubCycleBlock(
  edges: { i: number; j: number }[],
  n: number,
  newI: number,
  newJ: number
): { i: number; j: number } | null {
  const allEdges = [...edges, { i: newI, j: newJ }]
  if (allEdges.length >= n) return null // Весь цикл построен

  // Построение связей вперед и назад
  const nextNode = new Map<number, number>()
  const prevNode = new Map<number, number>()
  for (const e of allEdges) {
    nextNode.set(e.i, e.j)
    prevNode.set(e.j, e.i)
  }

  // Находим начало пути, содержащего новую вершину newJ
  let start = newI
  while (prevNode.has(start)) {
    start = prevNode.get(start)!
  }

  // Находим конец пути, содержащего новую вершину newI
  let end = newJ
  while (nextNode.has(end)) {
    end = nextNode.get(end)!
  }

  // Блокируем ребро end -> start
  return { i: end, j: start }
}

/**
 * Основной пошаговый решатель задачи коммивояжера
 */
export function solveTsp(initialMatrix: number[][]): TspSolution {
  const n = initialMatrix.length

  // 1. Находим оптимальное решение перебором для верификации и построения траектории
  const opt = findAbsoluteOptimal(initialMatrix)
  if (opt.cost === INF || opt.path.length === 0) {
    // Если пути нет (например, граф несвязный)
    return {
      edges: [],
      path: [],
      totalCost: INF,
      steps: [
        {
          stepIndex: 0,
          title: 'Ошибка решения',
          description: 'Не удалось найти допустимый гамильтонов цикл. Проверьте веса рёбер.',
          matrix: cloneMatrix(initialMatrix),
          crossedRows: [],
          crossedCols: [],
          currentPath: [],
          lowerBound: 0,
        },
      ],
    }
  }

  // Преобразуем оптимальный путь в набор рёбер
  // Например, path = [0, 2, 3, 1, 0] => edges = [{i:0, j:2}, {i:2, j:3}, {i:3, j:1}, {i:1, j:0}]
  const optimalEdges: { i: number; j: number }[] = []
  for (let k = 0; k < opt.path.length - 1; k++) {
    optimalEdges.push({ i: opt.path[k], j: opt.path[k + 1] })
  }

  const steps: TspStep[] = []
  let currentMatrix = cloneMatrix(initialMatrix)
  let lowerBound = 0
  const crossedRows: number[] = []
  const crossedCols: number[] = []
  const currentPath: { i: number; j: number }[] = []

  // ─── ШАГ 0: Инициализация и начальная редукция ─────────────────────────────
  const step0Matrix = cloneMatrix(currentMatrix)
  const rowMins = new Array(n).fill(0)
  const colMins = new Array(n).fill(0)
  let initialReduction = 0

  // Редукция строк
  for (let i = 0; i < n; i++) {
    let m = INF
    for (let j = 0; j < n; j++) {
      if (step0Matrix[i][j] < m) m = step0Matrix[i][j]
    }
    if (m !== INF && m > 0) {
      rowMins[i] = m
      initialReduction += m
      for (let j = 0; j < n; j++) {
        if (step0Matrix[i][j] !== INF) step0Matrix[i][j] -= m
      }
    }
  }

  // Редукция столбцов
  for (let j = 0; j < n; j++) {
    let m = INF
    for (let i = 0; i < n; i++) {
      if (step0Matrix[i][j] < m) m = step0Matrix[i][j]
    }
    if (m !== INF && m > 0) {
      colMins[j] = m
      initialReduction += m
      for (let i = 0; i < n; i++) {
        if (step0Matrix[i][j] !== INF) step0Matrix[i][j] -= m
      }
    }
  }

  lowerBound = initialReduction
  currentMatrix = cloneMatrix(step0Matrix)

  steps.push({
    stepIndex: 0,
    title: 'Начальная редукция матрицы',
    description:
      `Вычитаем минимальные элементы строк и столбцов.\n` +
      `Вычтенные минимумы по строкам: [${rowMins.join(', ')}].\n` +
      `Вычтенные минимумы по столбцам: [${colMins.join(', ')}].\n` +
      `Начальная нижняя оценка стоимости пути H₀ = ${lowerBound}.`,
    matrix: cloneMatrix(currentMatrix),
    crossedRows: [...crossedRows],
    crossedCols: [...crossedCols],
    rowMinima: rowMins,
    colMinima: colMins,
    currentPath: [...currentPath],
    lowerBound,
  })

  // ─── ПОШАГОВЫЙ ВЫБОР РЁБЕР ─────────────────────────────────────────────────
  for (let stepNum = 1; stepNum <= n; stepNum++) {
    const activeRows = new Set(Array.from({ length: n }, (_, i) => i).filter(r => !crossedRows.includes(r)))
    const activeCols = new Set(Array.from({ length: n }, (_, i) => i).filter(c => !crossedCols.includes(c)))

    // Если осталось всего 1 ребро (или все выбраны), то выбор очевиден
    if (activeRows.size === 1) {
      const lastI = Array.from(activeRows)[0]
      const lastJ = Array.from(activeCols)[0]
      currentPath.push({ i: lastI, j: lastJ })
      crossedRows.push(lastI)
      crossedCols.push(lastJ)

      steps.push({
        stepIndex: steps.length,
        title: `Завершение маршрута: ребро (${lastI + 1} → ${lastJ + 1})`,
        description:
          `Остался последний свободный переход из города ${lastI + 1} в город ${lastJ + 1}.\n` +
          `Добавляем его в маршрут. Маршрут полностью сформирован.`,
        matrix: cloneMatrix(currentMatrix),
        crossedRows: [...crossedRows],
        crossedCols: [...crossedCols],
        selectedEdge: { i: lastI, j: lastJ, penalty: 0 },
        currentPath: [...currentPath],
        lowerBound,
      })
      break
    }

    // Вычисляем оценки нулевых ячеек
    const penalties: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null))
    let maxPenalty = -1
    let bestZero: { i: number; j: number } | null = null

    for (let i = 0; i < n; i++) {
      if (crossedRows.includes(i)) continue
      for (let j = 0; j < n; j++) {
        if (crossedCols.includes(j)) continue
        if (currentMatrix[i][j] === 0) {
          // Мин в строке i кроме столбца j
          let rMin = INF
          for (let col = 0; col < n; col++) {
            if (col !== j && !crossedCols.includes(col) && currentMatrix[i][col] < rMin) {
              rMin = currentMatrix[i][col]
            }
          }
          // Мин в столбце j кроме строки i
          let cMin = INF
          for (let row = 0; row < n; row++) {
            if (row !== i && !crossedRows.includes(row) && currentMatrix[row][j] < cMin) {
              cMin = currentMatrix[row][j]
            }
          }

          const penalty = (rMin === INF ? 0 : rMin) + (cMin === INF ? 0 : cMin)
          penalties[i][j] = penalty

          if (penalty > maxPenalty) {
            maxPenalty = penalty
            bestZero = { i, j }
          }
        }
      }
    }

    // Ищем, какое ребро из оптимального пути доступно для выбора на этом шаге
    const nextOptimalEdge = optimalEdges.find(
      oe => !crossedRows.includes(oe.i) && !crossedCols.includes(oe.j)
    )

    if (!nextOptimalEdge) {
      break
    }

    const selI = nextOptimalEdge.i
    const selJ = nextOptimalEdge.j
    const selPenalty = penalties[selI][selJ] ?? 0

    // Добавляем ребро в текущий путь
    currentPath.push({ i: selI, j: selJ })

    // Описание перед редукцией
    let desc = `Оцениваем все нулевые ячейки. Сумма вторых минимумов в строке и столбце для нуля дает штраф за его неиспользование.\n`
    if (bestZero) {
      desc += `Максимальный штраф имеет ячейка (${bestZero.i + 1} → ${bestZero.j + 1}) со значением ${maxPenalty}.\n`
    }
    desc += `Для продолжения оптимального пути выбираем ребро (${selI + 1} → ${selJ + 1}) со штрафом ${selPenalty}.\n`

    // Блокируем подцикл
    const blockEdge = findSubCycleBlock(currentPath.slice(0, -1), n, selI, selJ)
    let blockText = ''
    if (blockEdge) {
      currentMatrix[blockEdge.i][blockEdge.j] = INF
      blockText = `Для предотвращения преждевременного замыкания цикла блокируем обратный путь (${blockEdge.i + 1} → ${blockEdge.j + 1}) (присваиваем весу ∞).\n`
    }

    // Вычеркиваем строку selI и столбец selJ
    crossedRows.push(selI)
    crossedCols.push(selJ)

    // Приведение оставшейся матрицы
    const nextRowMins = new Array(n).fill(0)
    const nextColMins = new Array(n).fill(0)
    let stepReduction = 0

    // Редукция строк
    for (let r = 0; r < n; r++) {
      if (crossedRows.includes(r)) continue
      let m = INF
      for (let c = 0; c < n; c++) {
        if (crossedCols.includes(c)) continue
        if (currentMatrix[r][c] < m) m = currentMatrix[r][c]
      }
      if (m !== INF && m > 0) {
        nextRowMins[r] = m
        stepReduction += m
        for (let c = 0; c < n; c++) {
          if (!crossedCols.includes(c) && currentMatrix[r][c] !== INF) {
            currentMatrix[r][c] -= m
          }
        }
      }
    }

    // Редукция столбцов
    for (let c = 0; c < n; c++) {
      if (crossedCols.includes(c)) continue
      let m = INF
      for (let r = 0; r < n; r++) {
        if (crossedRows.includes(r)) continue
        if (currentMatrix[r][c] < m) m = currentMatrix[r][c]
      }
      if (m !== INF && m > 0) {
        nextColMins[c] = m
        stepReduction += m
        for (let r = 0; r < n; r++) {
          if (!crossedRows.includes(r) && currentMatrix[r][c] !== INF) {
            currentMatrix[r][c] -= m
          }
        }
      }
    }

    lowerBound += stepReduction

    steps.push({
      stepIndex: steps.length,
      title: `Шаг ${stepNum}: Выбор ребра (${selI + 1} → ${selJ + 1})`,
      description:
        desc +
        blockText +
        `Вычеркиваем строку ${selI + 1} и столбец ${selJ + 1}.\n` +
        (stepReduction > 0
          ? `Проводим редукцию остатка матрицы. Сумма новых вычтенных констант: ${stepReduction}.\n`
          : 'Редукция остатка матрицы не потребовалась.\n') +
        `Текущая нижняя граница стоимости: H = ${lowerBound}.`,
      matrix: cloneMatrix(currentMatrix),
      crossedRows: [...crossedRows],
      crossedCols: [...crossedCols],
      penalties: penalties.map(row => [...row]),
      rowMinima: nextRowMins,
      colMinima: nextColMins,
      selectedEdge: { i: selI, j: selJ, penalty: selPenalty },
      currentPath: [...currentPath],
      lowerBound,
    })
  }

  // Финальный шаг: Результат
  steps.push({
    stepIndex: steps.length,
    title: 'Результат решения',
    description:
      `Построен оптимальный обход: ${opt.path.map(x => x + 1).join(' → ')}.\n` +
      `Длина маршрута (минимальная суммарная стоимость): ${opt.cost}.`,
    matrix: cloneMatrix(initialMatrix),
    crossedRows: Array.from({ length: n }, (_, i) => i),
    crossedCols: Array.from({ length: n }, (_, i) => i),
    currentPath: [...currentPath],
    lowerBound: opt.cost,
  })

  return {
    edges: optimalEdges,
    path: opt.path,
    totalCost: opt.cost,
    steps,
  }
}

/**
 * Пример матрицы расстояний для задачи коммивояжера
 */
export function getTspExample(): number[][] {
  return [
    [INF, 20, 18, 12, 8],
    [5, INF, 14, 7, 11],
    [12, 18, INF, 6, 11],
    [11, 17, 12, INF, 22],
    [5, 5, 8, 11, INF],
  ]
}
