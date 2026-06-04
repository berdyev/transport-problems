/**
 * Алгоритм Дейкстры — поиск кратчайшего пути в сети
 */

export interface GraphNode {
  id: number
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  id: number
  from: number
  to: number
  weight: number
}

export interface DijkstraStep {
  phase: 'init' | 'select' | 'relax' | 'skip' | 'done'
  currentNode: number | null
  distances: number[]           // distances[nodeId] = текущее расстояние
  previous: (number | null)[]   // previous[nodeId] = предшественник
  visited: number[]             // посещённые узлы
  queue: number[]               // очередь (неposещённые)
  relaxed?: { from: number; to: number; oldDist: number; newDist: number }
  title: string
  description: string
}

export interface DijkstraResult {
  distances: number[]
  previous: (number | null)[]
  steps: DijkstraStep[]
  reachable: boolean[]
}

const INF = Infinity

// ─── Вспомогательные ─────────────────────────────────────────────────────────

function getPath(previous: (number | null)[], target: number): number[] {
  const path: number[] = []
  let cur: number | null = target
  while (cur !== null) {
    path.unshift(cur)
    cur = previous[cur]
  }
  return path
}

function distLabel(d: number): string {
  return d === INF ? '∞' : String(d)
}

// ─── Основной алгоритм ───────────────────────────────────────────────────────

export function dijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: number,
  directed: boolean
): DijkstraResult {
  const n = nodes.length
  const ids = nodes.map(nd => nd.id)

  // Матрица смежности (id-indexed map)
  const adj: Map<number, { to: number; weight: number }[]> = new Map()
  ids.forEach(id => adj.set(id, []))

  for (const e of edges) {
    adj.get(e.from)!.push({ to: e.to, weight: e.weight })
    if (!directed) {
      adj.get(e.to)!.push({ to: e.from, weight: e.weight })
    }
  }

  const steps: DijkstraStep[] = []
  const dist: number[] = new Array(Math.max(...ids) + 1).fill(INF)
  const prev: (number | null)[] = new Array(Math.max(...ids) + 1).fill(null)
  const visited = new Set<number>()

  dist[sourceId] = 0

  const labelOf = (id: number) => nodes.find(n => n.id === id)?.label ?? String(id)

  // Инициализация
  const initDistStr = ids.map(id => `d(${labelOf(id)})=${distLabel(dist[id])}`).join(', ')
  steps.push({
    phase: 'init',
    currentNode: null,
    distances: [...dist],
    previous: [...prev],
    visited: [],
    queue: [...ids],
    title: 'Инициализация',
    description:
      `Источник: вершина ${labelOf(sourceId)}. Устанавливаем d(${labelOf(sourceId)})=0, все остальные = ∞.\n` +
      `Очередь: {${ids.map(labelOf).join(', ')}}`,
  })

  // Основной цикл
  while (visited.size < n) {
    // Выбираем вершину с минимальным расстоянием из непосещённых
    let uId: number | null = null
    let minDist = INF
    for (const id of ids) {
      if (!visited.has(id) && dist[id] < minDist) {
        minDist = dist[id]
        uId = id
      }
    }

    if (uId === null || dist[uId] === INF) {
      const unreachable = ids.filter(id => !visited.has(id)).map(labelOf)
      steps.push({
        phase: 'done',
        currentNode: null,
        distances: [...dist],
        previous: [...prev],
        visited: [...visited],
        queue: ids.filter(id => !visited.has(id)),
        title: 'Алгоритм завершён',
        description: unreachable.length > 0
          ? `Вершины ${unreachable.join(', ')} недостижимы из источника.`
          : 'Все вершины обработаны. Кратчайшие пути найдены!',
      })
      break
    }

    const queue = ids.filter(id => !visited.has(id))
    steps.push({
      phase: 'select',
      currentNode: uId,
      distances: [...dist],
      previous: [...prev],
      visited: [...visited],
      queue,
      title: `Выбираем вершину ${labelOf(uId)}`,
      description:
        `Из непосещённых {${queue.map(labelOf).join(', ')}} выбираем вершину с минимальным d = ${dist[uId]}: ` +
        `вершина ${labelOf(uId)}. Помечаем как посещённую.`,
    })

    visited.add(uId)

    // Релаксация рёбер
    const neighbours = adj.get(uId) ?? []
    for (const { to, weight } of neighbours) {
      if (visited.has(to)) {
        steps.push({
          phase: 'skip',
          currentNode: uId,
          distances: [...dist],
          previous: [...prev],
          visited: [...visited],
          queue: ids.filter(id => !visited.has(id)),
          relaxed: { from: uId, to, oldDist: dist[to], newDist: dist[to] },
          title: `Ребро (${labelOf(uId)} → ${labelOf(to)}) пропущено`,
          description: `Вершина ${labelOf(to)} уже посещена — пропускаем.`,
        })
        continue
      }

      const newDist = dist[uId] + weight
      if (newDist < dist[to]) {
        const old = dist[to]
        dist[to] = newDist
        prev[to] = uId
        steps.push({
          phase: 'relax',
          currentNode: uId,
          distances: [...dist],
          previous: [...prev],
          visited: [...visited],
          queue: ids.filter(id => !visited.has(id)),
          relaxed: { from: uId, to, oldDist: old, newDist },
          title: `Релаксация: ребро (${labelOf(uId)} → ${labelOf(to)})`,
          description:
            `d(${labelOf(uId)}) + w(${labelOf(uId)},${labelOf(to)}) = ${dist[uId]} + ${weight} = ${newDist} ` +
            `< d(${labelOf(to)}) = ${distLabel(old)}.\n` +
            `Обновляем: d(${labelOf(to)}) = ${newDist}, предшественник = ${labelOf(uId)}.`,
        })
      } else {
        steps.push({
          phase: 'skip',
          currentNode: uId,
          distances: [...dist],
          previous: [...prev],
          visited: [...visited],
          queue: ids.filter(id => !visited.has(id)),
          relaxed: { from: uId, to, oldDist: dist[to], newDist },
          title: `Ребро (${labelOf(uId)} → ${labelOf(to)}) — не улучшает`,
          description:
            `d(${labelOf(uId)}) + w = ${dist[uId]} + ${weight} = ${newDist} ` +
            `≥ d(${labelOf(to)}) = ${distLabel(dist[to])}. Обновление не требуется.`,
        })
      }
    }
  }

  if (visited.size === n) {
    const summary = ids.map(id => `d(${labelOf(id)})=${distLabel(dist[id])}`).join(', ')
    steps.push({
      phase: 'done',
      currentNode: null,
      distances: [...dist],
      previous: [...prev],
      visited: [...visited],
      queue: [],
      title: '✅ Кратчайшие пути найдены',
      description: `Все вершины обработаны.\n${summary}`,
    })
  }

  return {
    distances: dist,
    previous: prev,
    steps,
    reachable: ids.map(id => dist[id] < INF),
  }
}

// ─── Получить путь от источника до цели ──────────────────────────────────────

export function getShortestPath(
  previous: (number | null)[],
  sourceId: number,
  targetId: number
): number[] {
  const path = getPath(previous, targetId)
  if (path.length === 0 || path[0] !== sourceId) return []
  return path
}

// ─── Примеры графов ──────────────────────────────────────────────────────────

export function exampleGraph(): { nodes: GraphNode[]; edges: GraphEdge[]; directed: boolean } {
  // Классический пример для демонстрации Дейкстры
  const cx = 380, cy = 240, r = 160
  const angles = [270, 342, 54, 126, 198].map(a => (a * Math.PI) / 180)
  const labels = ['A', 'B', 'C', 'D', 'E']
  const nodes: GraphNode[] = labels.map((label, i) => ({
    id: i,
    label,
    x: Math.round(cx + r * Math.cos(angles[i])),
    y: Math.round(cy + r * Math.sin(angles[i])),
  }))
  const edges: GraphEdge[] = [
    { id: 0, from: 0, to: 1, weight: 4 },
    { id: 1, from: 0, to: 2, weight: 2 },
    { id: 2, from: 1, to: 2, weight: 5 },
    { id: 3, from: 1, to: 3, weight: 10 },
    { id: 4, from: 2, to: 4, weight: 3 },
    { id: 5, from: 4, to: 3, weight: 4 },
    { id: 6, from: 3, to: 4, weight: 1 },
  ]
  return { nodes, edges, directed: false }
}
