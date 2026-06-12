/**
 * Алгоритм поиска потока минимальной стоимости (Min-Cost Max-Flow)
 * методом последовательного нахождения кратчайших путей (Successive Shortest Path)
 * с использованием алгоритма SPFA (Shortest Path Faster Algorithm) для остаточной сети.
 */
import { currentLocale } from '../locale'

export interface McfNode {
  id: number
  label: string
  x: number
  y: number
  value: number // Баланс узла: >0 - источник (производство), <0 - сток (потребление), 0 - транзит
}

export interface McfEdge {
  id: number
  from: number
  to: number
  cost: number     // Стоимость за единицу потока
  capacity: number // Пропускная способность
  flow?: number    // Текущий поток (после решения)
}

export interface McfStep {
  stepIndex: number
  title: string
  description: string
  // Состояние потоков на этом шаге
  flows: { [edgeId: number]: number }
  // Найденный дополняющий путь (массив ID вершин)
  path: number[] | null
  pathFlow: number
  pathCost: number
  // Вспомогательные данные для визуализации
  residualEdges?: { from: number; to: number; capacity: number; cost: number }[]
}

export interface McfSolution {
  nodes: McfNode[]
  edges: McfEdge[]
  totalFlow: number
  totalCost: number
  steps: McfStep[]
  isBalanced: boolean
  supplySum: number
  demandSum: number
}

// Вспомогательная остаточная сеть для алгоритма
interface ResidualEdge {
  from: number
  to: number
  capacity: number
  cost: number
  flow: number
  originalEdgeId: number // ID оригинального ребра или -1 для обратных
  isReverse: boolean
}

export function solveMinCostMaxFlow(
  nodes: McfNode[],
  edges: McfEdge[]
): McfSolution {
  const isTkm = currentLocale.value === 'tkm'
  const steps: McfStep[] = []
  
  // 1. Проверим баланс сети
  let supplySum = 0
  let demandSum = 0
  for (const n of nodes) {
    if (n.value > 0) supplySum += n.value
    if (n.value < 0) demandSum -= n.value // demandSum будет положительным
  }

  // Создаем копии ребер с инициализацией потока 0
  const solvedEdges: McfEdge[] = edges.map(e => ({ ...e, flow: 0 }))
  
  // ID супер-источника и супер-стока
  const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) : 0
  const S = maxNodeId + 1
  const T = maxNodeId + 2

  // Строим остаточную сеть
  // Для каждого исходного ориентированного ребра создаем прямое и обратное
  const residualAdj: Map<number, ResidualEdge[]> = new Map()
  const allNodeIds = [...nodes.map(n => n.id), S, T]
  allNodeIds.forEach(id => residualAdj.set(id, []))

  // Добавляем ребра из графа в остаточную сеть
  solvedEdges.forEach(e => {
    // Прямое ребро
    residualAdj.get(e.from)!.push({
      from: e.from,
      to: e.to,
      capacity: e.capacity,
      cost: e.cost,
      flow: 0,
      originalEdgeId: e.id,
      isReverse: false
    })
    // Обратное ребро
    residualAdj.get(e.to)!.push({
      from: e.to,
      to: e.from,
      capacity: 0,
      cost: -e.cost,
      flow: 0,
      originalEdgeId: e.id,
      isReverse: true
    })
  })

  // Подключаем супер-источник S и супер-сток T
  nodes.forEach(n => {
    if (n.value > 0) {
      // От S к источнику
      residualAdj.get(S)!.push({
        from: S,
        to: n.id,
        capacity: n.value,
        cost: 0,
        flow: 0,
        originalEdgeId: -1,
        isReverse: false
      })
      residualAdj.get(n.id)!.push({
        from: n.id,
        to: S,
        capacity: 0,
        cost: 0,
        flow: 0,
        originalEdgeId: -1,
        isReverse: true
      })
    } else if (n.value < 0) {
      // От стока к T
      residualAdj.get(n.id)!.push({
        from: n.id,
        to: T,
        capacity: -n.value,
        cost: 0,
        flow: 0,
        originalEdgeId: -1,
        isReverse: false
      })
      residualAdj.get(T)!.push({
        from: T,
        to: n.id,
        capacity: 0,
        cost: 0,
        flow: 0,
        originalEdgeId: -1,
        isReverse: true
      })
    }
  })

  let stepCount = 0
  
  // Добавим начальный шаг
  steps.push({
    stepIndex: stepCount++,
    title: isTkm ? 'Galyndy torun başlanmagy' : 'Инициализация остаточной сети',
    description: isTkm
      ? `Çeşmeleriň umumy önümçiligi: ${supplySum}. Sarp edişleriň umumy islegi: ${demandSum}.\nMeseläni klassiki iň uly akym meselesine getirmek üçin galp çeşme S we galp sarp ediş T döredildi.`
      : `Суммарное производство источников: ${supplySum}. Суммарная потребность стоков: ${demandSum}.\nСозданы фиктивный источник S и фиктивный сток T для сведения задачи к классической задаче о максимальном потоке.`,
    flows: Object.fromEntries(solvedEdges.map(e => [e.id, 0])),
    path: null,
    pathFlow: 0,
    pathCost: 0
  })

  let totalFlow = 0
  let totalCost = 0

  // Алгоритм поиска дополняющих путей (Successive Shortest Path)
  while (true) {
    // Находим кратчайший путь от S до T во вспомогательном графе остаточной сети с помощью SPFA
    const dist: { [key: number]: number } = {}
    const parentEdge: { [key: number]: ResidualEdge | null } = {}
    allNodeIds.forEach(id => {
      dist[id] = Infinity
      parentEdge[id] = null
    })
    
    dist[S] = 0
    const inQueue = new Set<number>([S])
    const queue = [S]

    while (queue.length > 0) {
      const u = queue.shift()!
      inQueue.delete(u)

      const edgesFromU = residualAdj.get(u) ?? []
      for (const edge of edgesFromU) {
        const remainingCapacity = edge.capacity - edge.flow
        if (remainingCapacity > 0 && dist[u] + edge.cost < dist[edge.to]) {
          dist[edge.to] = dist[u] + edge.cost
          parentEdge[edge.to] = edge
          if (!inQueue.has(edge.to)) {
            inQueue.add(edge.to)
            queue.push(edge.to)
          }
        }
      }
    }

    // Если пути до T нет, то поток максимален
    if (dist[T] === Infinity) {
      break
    }

    // Восстанавливаем путь и находим минимальную пропускную способность по нему
    let pathFlow = Infinity
    let curr = T
    const pathNodes: number[] = []
    
    while (curr !== S) {
      pathNodes.unshift(curr)
      const edge = parentEdge[curr]!
      pathFlow = Math.min(pathFlow, edge.capacity - edge.flow)
      curr = edge.from
    }
    pathNodes.unshift(S)

    // Пускаем поток величиной pathFlow по пути
    curr = T
    let pathCostSum = 0
    while (curr !== S) {
      const edge = parentEdge[curr]!
      edge.flow += pathFlow
      pathCostSum += edge.cost
      
      // Находим и обновляем парное обратное ребро в остаточной сети
      const revEdges = residualAdj.get(edge.to) ?? []
      const revEdge = revEdges.find(re => re.to === edge.from && re.originalEdgeId === edge.originalEdgeId && re.isReverse === !edge.isReverse)!
      revEdge.flow -= pathFlow

      // Если это реальное ребро графа, обновляем поток в результирующем графе
      if (edge.originalEdgeId !== -1) {
        const orig = solvedEdges.find(oe => oe.id === edge.originalEdgeId)!
        if (edge.isReverse) {
          orig.flow = (orig.flow ?? 0) - pathFlow
        } else {
          orig.flow = (orig.flow ?? 0) + pathFlow
        }
      }

      curr = edge.from
    }

    totalFlow += pathFlow
    totalCost += pathFlow * dist[T]

    // Сохраняем шаг
    const labelsPath = pathNodes.map(id => {
      if (id === S) return 'S'
      if (id === T) return 'T'
      return nodes.find(n => n.id === id)?.label ?? String(id)
    })

    steps.push({
      stepIndex: stepCount++,
      title: isTkm 
        ? `Ädim ${stepCount - 1}: ${labelsPath.join(' → ')} ugry boýunça akymy goýbermek` 
        : `Шаг ${stepCount - 1}: Пуск потока по пути ${labelsPath.join(' → ')}`,
      description: isTkm
        ? `Birlik üçin ${dist[T]} bahaly iň gysga üsti ýetiriji ýol tapyldy.\nGoşulan akymyň mukdary: ${pathFlow}.\nGeçiş ugry: ${labelsPath.join(' → ')}.\nBu ädimiň bahasy: ${pathFlow} * ${dist[T]} = ${pathFlow * dist[T]}.`
        : `Найден кратчайший дополняющий путь стоимостью ${dist[T]} за единицу.\nВеличина добавленного потока: ${pathFlow}.\nПуть прохождения: ${labelsPath.join(' → ')}.\nСтоимость этого шага: ${pathFlow} * ${dist[T]} = ${pathFlow * dist[T]}.`,
      flows: Object.fromEntries(solvedEdges.map(e => [e.id, e.flow ?? 0])),
      path: pathNodes.filter(id => id !== S && id !== T), // оставляем только реальные вершины для подсветки
      pathFlow,
      pathCost: dist[T]
    })
  }

  // Финальный шаг
  steps.push({
    stepIndex: stepCount++,
    title: isTkm ? 'Çözgüt tamamlandy' : 'Решение завершено',
    description: isTkm
      ? `Iň oňat akym üstünlikli paýlandy!\nUmumy daşalan mukdar: ${totalFlow}.\nIň az umumy baha (çykdajy): ${totalCost}.`
      : `Оптимальный поток успешно распределен!\nОбщий перевезенный объем: ${totalFlow}.\nМинимальная суммарная стоимость (расход): ${totalCost}.`,
    flows: Object.fromEntries(solvedEdges.map(e => [e.id, e.flow ?? 0])),
    path: null,
    pathFlow: 0,
    pathCost: 0
  })

  return {
    nodes,
    edges: solvedEdges,
    totalFlow,
    totalCost,
    steps,
    isBalanced: supplySum === demandSum,
    supplySum,
    demandSum
  }
}
