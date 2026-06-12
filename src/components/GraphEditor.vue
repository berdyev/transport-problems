<template>
  <div class="graph-editor-card card">
    <div class="editor-layout">
      <!-- Панель управления графом -->
      <div class="editor-sidebar">
        <h3 class="panel-title">{{ t('ge.panel_title') }}</h3>

        <!-- Пресеты -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('ge.presets') }}</label>
          <div class="btn-group-row">
            <button class="btn btn-secondary btn-sm" @click="loadExample">
              {{ t('ge.preset_example') }}
            </button>
            <button class="btn btn-secondary btn-sm" @click="generateRandom">
              {{ t('ge.preset_random') }}
            </button>
            <button class="btn btn-ghost btn-sm text-danger" @click="clearGraph">
              {{ t('ge.clear') }}
            </button>
          </div>
        </div>

        <!-- Параметры графа -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('ge.graph_type') }}</label>
          <div class="toggle-container">
            <button
              class="toggle-btn"
              :class="{ active: !directed }"
              @click="setDirected(false)"
            >
              {{ t('ge.undirected') }}
            </button>
            <button
              class="toggle-btn"
              :class="{ active: directed }"
              @click="setDirected(true)"
            >
              {{ t('ge.directed') }}
            </button>
          </div>
        </div>

        <!-- Добавление вершины -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('ge.nodes') }}</label>
          <div class="add-node-row">
            <button class="btn btn-primary btn-sm w-full" @click="addNode" :disabled="nodes.length >= 10">
              {{ t('ge.add_node') }} ({{ nextNodeLabel }})
            </button>
          </div>
          <p class="section-hint" v-if="nodes.length >= 10">{{ t('ge.max_nodes') }}</p>
        </div>

        <!-- Добавление ребра -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('ge.add_edge') }}</label>
          <div class="edge-form">
            <div class="edge-nodes-select">
              <div class="select-wrapper">
                <select v-model="edgeForm.from" class="editor-select">
                  <option :value="null" disabled>{{ t('ge.from') }}</option>
                  <option v-for="node in nodes" :key="`from-${node.id}`" :value="node.id">
                    {{ node.label }}
                  </option>
                </select>
              </div>
              <span class="edge-direction-arrow">→</span>
              <div class="select-wrapper">
                <select v-model="edgeForm.to" class="editor-select">
                  <option :value="null" disabled>{{ t('ge.to') }}</option>
                  <option v-for="node in nodes" :key="`to-${node.id}`" :value="node.id">
                    {{ node.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="edge-weight-row">
              <input
                type="number"
                v-model.number="edgeForm.weight"
                class="input-num editor-input"
                :placeholder="t('ge.weight')"
                min="1"
              />
              <button class="btn btn-secondary btn-sm" @click="addEdge">
                {{ t('ge.add_edge_btn') }}
              </button>
            </div>
            <p v-if="edgeError" class="error-msg">{{ edgeError }}</p>
          </div>
        </div>

        <!-- Выбор источника -->
        <div class="sidebar-section highlight-section">
          <label class="section-label">{{ t('ge.source') }}</label>
          <div class="select-wrapper">
            <select v-model="sourceId" class="editor-select source-select">
              <option v-for="node in nodes" :key="`src-${node.id}`" :value="node.id">
                {{ t('ge.nodes').slice(0, -1) }} {{ node.label }}
              </option>
            </select>
          </div>
          <p class="section-hint">{{ t('ge.dblclick_hint') }}</p>
        </div>

        <!-- Кнопка запуска -->
        <button
          class="btn btn-primary solve-trigger-btn"
          :disabled="nodes.length < 2"
          @click="triggerSolve"
        >
          {{ t('ge.solve') }}
        </button>
      </div>

      <!-- Холст SVG с интерактивным графом -->
      <div class="editor-canvas-wrap">
        <div class="canvas-header">
          <span class="canvas-title">{{ t('ge.canvas_title') }}</span>
          <span class="canvas-hint">{{ t('ge.canvas_hint') }}</span>
        </div>

        <div class="canvas-container">
          <svg
            ref="svgRef"
            class="graph-svg"
            viewBox="0 0 800 450"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
          >
            <!-- Маркеры стрелок для ориентированного графа -->
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-dim)" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
              </marker>
            </defs>

            <!-- Сетка фона -->
            <g class="grid-lines">
              <line v-for="x in 8" :key="`gx-${x}`" :x1="x * 100" y1="0" :x2="x * 100" y2="450" stroke="rgba(255,255,255,0.015)" />
              <line v-for="y in 5" :key="`gy-${y}`" x1="0" :y1="y * 90" x2="800" :y2="y * 90" stroke="rgba(255,255,255,0.015)" />
            </g>

            <!-- Рёбра -->
            <g class="edges-group">
              <g v-for="edge in edgeLines" :key="`el-${edge.id}`" class="edge-group">
                <!-- Интерактивная невидимая толстая линия для удобного выбора/удаления -->
                <line
                  :x1="edge.x1"
                  :y1="edge.y1"
                  :x2="edge.x2"
                  :y2="edge.y2"
                  stroke="transparent"
                  stroke-width="12"
                  class="edge-hover-line"
                  @click="deleteEdge(edge.id)"
                />
                <!-- Отображаемая линия ребра -->
                <line
                  :x1="edge.x1"
                  :y1="edge.y1"
                  :x2="edge.x2"
                  :y2="edge.y2"
                  :stroke="directed ? 'var(--text-dim)' : 'rgba(255,255,255,0.2)'"
                  stroke-width="2"
                  :marker-end="directed ? 'url(#arrow)' : ''"
                  class="edge-line"
                />
                <!-- Кнопка удаления (крестик при наведении) -->
                <circle
                  :cx="edge.midX"
                  :cy="edge.midY"
                  r="10"
                  fill="#f56565"
                  class="edge-delete-btn"
                  @click="deleteEdge(edge.id)"
                />
                <text
                  :x="edge.midX"
                  :y="edge.midY + 3"
                  class="edge-delete-icon"
                  text-anchor="middle"
                  font-size="10"
                  fill="white"
                  font-weight="bold"
                  @click="deleteEdge(edge.id)"
                >×</text>

                <!-- Вес ребра (кликабельный для редактирования) -->
                <g
                  class="edge-weight"
                  :class="{ 'editing': editingEdgeId === edge.id }"
                  :transform="`translate(${edge.midX}, ${edge.midY - 18})`"
                  @click.stop="startEditWeight(edge.id, edge.weight)"
                  title="Кликните, чтобы изменить вес"
                >
                  <rect
                    x="-16"
                    y="-11"
                    width="32"
                    height="22"
                    rx="6"
                    :fill="editingEdgeId === edge.id ? 'rgba(99,179,237,0.15)' : 'var(--bg-card2)'"
                    :stroke="editingEdgeId === edge.id ? 'var(--accent)' : 'var(--border)'"
                    stroke-width="1.5"
                    class="weight-rect"
                  />
                  <text
                    y="5"
                    text-anchor="middle"
                    font-size="12"
                    font-weight="bold"
                    :fill="editingEdgeId === edge.id ? 'var(--accent)' : 'var(--text-primary)'"
                  >
                    {{ edge.weight }}
                  </text>
                  <!-- Иконка редактирования -->
                  <text
                    x="10"
                    y="-4"
                    font-size="7"
                    fill="var(--text-dim)"
                    class="edit-icon"
                  >✎</text>
                </g>
              </g>
            </g>

            <!-- Вершины -->
            <g class="nodes-group">
              <g
                v-for="node in nodes"
                :key="`nd-${node.id}`"
                class="node-group"
                :class="{ 'is-source': node.id === sourceId }"
                :transform="`translate(${node.x}, ${node.y})`"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @dblclick="setSource(node.id)"
              >
                <!-- Задний круг -->
                <circle
                  r="24"
                  fill="var(--bg-card2)"
                  :stroke="node.id === sourceId ? 'var(--accent)' : 'rgba(255,255,255,0.2)'"
                  stroke-width="2"
                  class="node-bg"
                />
                <!-- Внутренний круг -->
                <circle
                  r="22"
                  :fill="node.id === sourceId ? 'rgba(99,179,237,0.12)' : 'var(--bg-input)'"
                />
                <!-- Буква вершины (cверху) -->
                <text
                  text-anchor="middle"
                  y="-3"
                  font-size="13"
                  font-weight="bold"
                  :fill="node.id === sourceId ? 'var(--accent)' : 'var(--text-primary)'"
                  class="node-text"
                >
                  {{ node.label }}
                </text>

                <!-- Маленькая кнопка удаления вершины -->
                <g class="node-delete-g" @click.stop="deleteNode(node.id)">
                  <circle cx="18" cy="-18" r="7" fill="#f56565" />
                  <text cx="18" cy="-18" x="18" y="-15" text-anchor="middle" font-size="9" fill="white" font-weight="bold">×</text>
                </g>
              </g>
            </g>
          </svg>

          <!-- Инлайн-поле редактирования веса ребра -->
          <div
            v-if="editingEdgeId !== null && editPopupPos"
            class="weight-edit-popup"
            :style="{ left: editPopupPos.x + 'px', top: editPopupPos.y + 'px' }"
            @click.stop
          >
            <label class="popup-label">{{ t('ge.edge_weight_label') }}</label>
            <div class="popup-row">
              <input
                ref="weightInputRef"
                type="number"
                v-model.number="editWeightValue"
                class="popup-input"
                min="1"
                @keydown.enter="confirmEditWeight"
                @keydown.esc="cancelEditWeight"
              />
              <button class="popup-btn ok" @click="confirmEditWeight">✓</button>
              <button class="popup-btn cancel" @click="cancelEditWeight">✕</button>
            </div>
          </div>

          </div>
        </div>

        <!-- Подвал холста со списком рёбер -->
        <div class="canvas-footer card-inner-list">
          <div class="footer-stat">
            <span>{{ t('ge.nodes_count') }}: <strong>{{ nodes.length }}</strong></span>
            <span class="stat-sep">|</span>
            <span>{{ t('ge.edges_count') }}: <strong>{{ edges.length }}</strong></span>
          </div>
          <div class="edges-info-list" v-if="edges.length > 0">
            <span class="list-title">{{ t('ge.edge_list') }}</span>
            <div class="badges-row">
              <span
                v-for="edge in edgeLines"
                :key="`b-${edge.id}`"
                class="edge-info-badge"
                @click="deleteEdge(edge.id)"
                title="Нажмите, чтобы удалить ребро"
              >
                {{ edge.fromLabel }} {{ directed ? '→' : '—' }} {{ edge.toLabel }} ({{ edge.weight }})
                <span class="badge-delete">×</span>
              </span>
            </div>
          </div>
          <div v-else class="empty-edges-text">{{ t('ge.empty_edges') }}</div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { t } from '../locale'
import { exampleGraph } from '../core/dijkstra'
import type { GraphNode, GraphEdge } from '../core/dijkstra'

const emit = defineEmits<{
  (e: 'solve', data: { nodes: GraphNode[]; edges: GraphEdge[]; sourceId: number; directed: boolean }): void
}>()

// Состояние редактора
const nodes = ref<GraphNode[]>([])
const edges = ref<GraphEdge[]>([])
const sourceId = ref<number>(0)
const directed = ref<boolean>(false)

// Форма добавления ребра
const edgeForm = ref<{ from: number | null; to: number | null; weight: number }>({
  from: null,
  to: null,
  weight: 5
})
const edgeError = ref<string>('')

// Ссылка на элемент SVG для перетаскивания
const svgRef = ref<SVGSVGElement | null>(null)
const isDragging = ref(false)
const draggedNodeId = ref<number | null>(null)

// Инлайн-редактирование веса
const editingEdgeId = ref<number | null>(null)
const editWeightValue = ref<number>(1)
const editPopupPos = ref<{ x: number; y: number } | null>(null)
const weightInputRef = ref<HTMLInputElement | null>(null)

// Генерация буквенных меток
const nextNodeLabel = computed(() => {
  return String.fromCharCode(65 + nodes.value.length)
})

// Преобразование ребер в экранные линии
const edgeLines = computed(() => {
  const r = 20 // Радиус вершины
  return edges.value.map(e => {
    const fromNode = nodes.value.find(n => n.id === e.from)
    const toNode = nodes.value.find(n => n.id === e.to)
    if (!fromNode || !toNode) {
      return { id: e.id, x1: 0, y1: 0, x2: 0, y2: 0, midX: 0, midY: 0, weight: e.weight, fromLabel: '', toLabel: '' }
    }

    const dx = toNode.x - fromNode.x
    const dy = toNode.y - fromNode.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    let x1 = fromNode.x
    let y1 = fromNode.y
    let x2 = toNode.x
    let y2 = toNode.y

    if (dist > 0) {
      const udx = dx / dist
      const udy = dy / dist
      // Сдвигаем концы линий к границам кругов
      x1 = Math.round(fromNode.x + r * udx)
      y1 = Math.round(fromNode.y + r * udy)
      x2 = Math.round(toNode.x - r * udx)
      y2 = Math.round(toNode.y - r * udy)
    }

    // Середина линии для веса
    const midX = Math.round((fromNode.x + toNode.x) / 2)
    const midY = Math.round((fromNode.y + toNode.y) / 2)

    return {
      id: e.id,
      x1,
      y1,
      x2,
      y2,
      midX,
      midY,
      weight: e.weight,
      fromLabel: fromNode.label,
      toLabel: toNode.label
    }
  })
})

// Загрузка классического примера
function loadExample() {
  const ex = exampleGraph()
  nodes.value = JSON.parse(JSON.stringify(ex.nodes))
  edges.value = JSON.parse(JSON.stringify(ex.edges))
  directed.value = ex.directed
  sourceId.value = nodes.value[0]?.id ?? 0
  edgeError.value = ''
}

// Генерация случайного связного графа
function generateRandom() {
  const count = 5 + Math.floor(Math.random() * 2) // 5 или 6 узлов
  const cx = 400
  const cy = 225
  const radius = 150

  // Создаем вершины по кругу
  const newNodes: GraphNode[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2
    newNodes.push({
      id: i,
      label: String.fromCharCode(65 + i),
      x: Math.round(cx + radius * Math.cos(angle) + (Math.random() * 30 - 15)),
      y: Math.round(cy + radius * Math.sin(angle) + (Math.random() * 30 - 15))
    })
  }

  // Создаем случайные ребра так, чтобы граф был связным
  const newEdges: GraphEdge[] = []
  let edgeId = 0

  // Связываем дерево (spanning tree) - гарантированная связность
  for (let i = 1; i < count; i++) {
    const from = Math.floor(Math.random() * i)
    newEdges.push({
      id: edgeId++,
      from,
      to: i,
      weight: 1 + Math.floor(Math.random() * 9)
    })
  }

  // Добавляем еще пару случайных ребер
  const maxExtra = count === 5 ? 2 : 3
  for (let i = 0; i < maxExtra; i++) {
    const from = Math.floor(Math.random() * count)
    const to = Math.floor(Math.random() * count)
    if (from !== to && !newEdges.some(e => (e.from === from && e.to === to) || (!directed.value && e.from === to && e.to === from))) {
      newEdges.push({
        id: edgeId++,
        from,
        to,
        weight: 1 + Math.floor(Math.random() * 9)
      })
    }
  }

  nodes.value = newNodes
  edges.value = newEdges
  sourceId.value = 0
  edgeError.value = ''
}

// Очистка графа
function clearGraph() {
  nodes.value = []
  edges.value = []
  sourceId.value = 0
  edgeError.value = ''
  edgeForm.value.from = null
  edgeForm.value.to = null
}

// Смена направленности графа
function setDirected(val: boolean) {
  directed.value = val
  // Если переключаемся на ненаправленный, можем объединить дублирующиеся ребра
  if (!val) {
    const seen = new Set<string>()
    edges.value = edges.value.filter(e => {
      const key1 = `${e.from}-${e.to}`
      const key2 = `${e.to}-${e.from}`
      if (seen.has(key1) || seen.has(key2)) {
        return false
      }
      seen.add(key1)
      return true
    })
  }
}

// Добавление вершины
function addNode() {
  if (nodes.value.length >= 10) return
  const id = nodes.value.length > 0 ? Math.max(...nodes.value.map(n => n.id)) + 1 : 0
  
  // Размещаем по спирали или сетке
  const angle = (nodes.value.length * 45 * Math.PI) / 180
  const x = Math.round(400 + 100 * Math.cos(angle))
  const y = Math.round(225 + 80 * Math.sin(angle))

  nodes.value.push({
    id,
    label: nextNodeLabel.value,
    x,
    y
  })

  // Если это первая вершина, делаем ее источником
  if (nodes.value.length === 1) {
    sourceId.value = id
  }
}

// Удаление вершины
function deleteNode(id: number) {
  // Удаляем вершину
  nodes.value = nodes.value.filter(n => n.id !== id)
  // Удаляем связанные ребра
  edges.value = edges.value.filter(e => e.from !== id && e.to !== id)
  
  // Переназначаем метки оставшихся вершин по алфавиту
  nodes.value.forEach((n, idx) => {
    n.label = String.fromCharCode(65 + idx)
  })

  // Если удалили источник, выбираем первую оставшуюся
  if (sourceId.value === id) {
    sourceId.value = nodes.value[0]?.id ?? 0
  }
}

// Добавление ребра
function addEdge() {
  edgeError.value = ''
  const { from, to, weight } = edgeForm.value
  
  if (from === null || to === null) {
    edgeError.value = 'Выберите обе вершины'
    return
  }
  if (from === to) {
    edgeError.value = 'Нельзя соединить вершину с собой'
    return
  }
  if (!weight || weight < 1) {
    edgeError.value = 'Вес должен быть больше 0'
    return
  }

  // Проверяем, существует ли уже такое ребро
  const exists = edges.value.some(e => {
    if (directed.value) {
      return e.from === from && e.to === to
    } else {
      return (e.from === from && e.to === to) || (e.from === to && e.to === from)
    }
  })

  if (exists) {
    edgeError.value = 'Связь между этими вершинами уже существует'
    return
  }

  const nextEdgeId = edges.value.length > 0 ? Math.max(...edges.value.map(e => e.id)) + 1 : 0
  edges.value.push({
    id: nextEdgeId,
    from,
    to,
    weight
  })

  // Сброс формы
  edgeForm.value.from = null
  edgeForm.value.to = null
}

// Удаление ребра
function deleteEdge(id: number) {
  edges.value = edges.value.filter(e => e.id !== id)
  if (editingEdgeId.value === id) cancelEditWeight()
}

// Редактирование веса ребра
function startEditWeight(edgeId: number, currentWeight: number) {
  // Найдём позицию ребра на экране
  if (!svgRef.value) return
  const svgRect = svgRef.value.getBoundingClientRect()
  const containerRect = svgRef.value.parentElement!.getBoundingClientRect()
  
  const edgeLine = edgeLines.value.find(e => e.id === edgeId)
  if (!edgeLine) return

  // Переводим SVG-координаты в экранные координаты
  const scaleX = svgRect.width / 800
  const scaleY = svgRect.height / 450
  const screenX = svgRect.left - containerRect.left + edgeLine.midX * scaleX
  const screenY = svgRect.top - containerRect.top + (edgeLine.midY - 18) * scaleY

  editingEdgeId.value = edgeId
  editWeightValue.value = currentWeight
  editPopupPos.value = { x: Math.round(screenX - 60), y: Math.round(screenY - 40) }
  
  // Фокус на поле ввода
  setTimeout(() => weightInputRef.value?.focus(), 50)
}

function confirmEditWeight() {
  if (editingEdgeId.value === null) return
  const w = Number(editWeightValue.value)
  if (!isNaN(w) && w >= 1) {
    const edge = edges.value.find(e => e.id === editingEdgeId.value)
    if (edge) edge.weight = w
  }
  cancelEditWeight()
}

function cancelEditWeight() {
  editingEdgeId.value = null
  editPopupPos.value = null
}

// Установка источника
function setSource(id: number) {
  sourceId.value = id
  // Закрываем попапы при двойном клике (setSource вызывается по @dblclick)
  cancelEditWeight()
}

// Координаты для SVG dragging
function getSVGCoords(event: MouseEvent) {
  if (!svgRef.value) return { x: 0, y: 0 }
  const rect = svgRef.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 800
  const y = ((event.clientY - rect.top) / rect.height) * 450
  return { x: Math.round(x), y: Math.round(y) }
}

function onNodeMouseDown(nodeId: number, event: MouseEvent) {
  event.preventDefault()
  draggedNodeId.value = nodeId
  isDragging.value = true
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value || draggedNodeId.value === null) return
  const coords = getSVGCoords(event)
  const node = nodes.value.find(n => n.id === draggedNodeId.value)
  if (node) {
    node.x = Math.max(30, Math.min(770, coords.x))
    node.y = Math.max(30, Math.min(420, coords.y))
  }
}

function onMouseUp() {
  isDragging.value = false
  draggedNodeId.value = null
}

// Отправка решения наверх
function triggerSolve() {
  if (nodes.value.length < 2) return
  // Передаем GraphNode
  const graphNodes: GraphNode[] = nodes.value.map(n => ({ id: n.id, label: n.label, x: n.x, y: n.y }))
  emit('solve', {
    nodes: graphNodes,
    edges: JSON.parse(JSON.stringify(edges.value)),
    sourceId: sourceId.value,
    directed: directed.value
  })
}

// По умолчанию загружаем пример
onMounted(() => {
  loadExample()
})
</script>

<style scoped>
.graph-editor-card {
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.editor-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  min-height: 520px;
}

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

/* Сайдбар */
.editor-sidebar {
  padding: 24px;
  background: var(--bg-card2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-hint {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}

.btn-group-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.w-full {
  width: 100%;
}

/* Переключатели */
.toggle-container {
  display: flex;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 2px;
  border: 1px solid var(--border);
}
.toggle-btn {
  flex: 1;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.toggle-btn.active {
  background: var(--bg-card2);
  color: var(--accent);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Формы */
.edge-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edge-nodes-select {
  display: flex;
  align-items: center;
  gap: 8px;
}
.edge-direction-arrow {
  color: var(--text-dim);
  font-weight: bold;
}
.select-wrapper {
  position: relative;
  flex: 1;
}
.select-wrapper::after {
  content: '▼';
  font-size: 8px;
  color: var(--text-dim);
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.editor-select {
  width: 100%;
  padding: 8px 24px 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  appearance: none;
  cursor: pointer;
}
.editor-select:focus {
  outline: none;
  border-color: var(--accent);
}
.edge-weight-row {
  display: flex;
  gap: 8px;
}
.editor-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
}

.error-msg {
  color: #f56565;
  font-size: 11px;
  margin-top: 2px;
}

.highlight-section {
  background: rgba(99,179,237,0.04);
  border: 1px solid rgba(99,179,237,0.1);
  padding: 12px;
  border-radius: 8px;
}

.source-select {
  border-color: rgba(99,179,237,0.3);
}

.solve-trigger-btn {
  margin-top: auto;
  font-weight: 700;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(99,179,237,0.15);
}

/* Холст */
.editor-canvas-wrap {
  display: flex;
  flex-direction: column;
}

.canvas-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.canvas-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.canvas-hint {
  font-size: 11px;
  color: var(--text-dim);
}

.canvas-container {
  flex: 1;
  background: var(--bg-card);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-svg {
  width: 100%;
  height: 100%;
  max-height: 480px;
  display: block;
  user-select: none;
}

/* Стили графа */
.node-group {
  cursor: grab;
  transition: transform 0.1s ease;
}
.node-group:active {
  cursor: grabbing;
}

.node-bg {
  transition: stroke 0.2s, stroke-width 0.2s;
}
.node-group:hover .node-bg {
  stroke: var(--accent);
  stroke-width: 2.5px;
}
.node-text {
  pointer-events: none;
  font-family: inherit;
}

.source-glow {
  animation: pulse-glow 2s infinite ease-in-out;
  transform-origin: center;
}

@keyframes pulse-glow {
  0% { transform: scale(1.0); opacity: 0.2; }
  50% { transform: scale(1.15); opacity: 0.6; }
  100% { transform: scale(1.0); opacity: 0.2; }
}

/* Кнопка удаления вершины */
.node-delete-g {
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}
.node-group:hover .node-delete-g {
  opacity: 1;
}

/* Рёбра */
.edge-hover-line {
  cursor: pointer;
}
.edge-delete-btn, .edge-delete-icon {
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.edge-group:hover .edge-delete-btn,
.edge-group:hover .edge-delete-icon {
  opacity: 1;
}

.edge-line {
  transition: stroke 0.2s;
}
.edge-group:hover .edge-line {
  stroke: #f56565 !important;
}

.edge-weight {
  cursor: pointer;
  transition: opacity 0.2s;
}
.edge-weight .weight-rect {
  transition: fill 0.2s, stroke 0.2s;
}
.edge-weight:hover .weight-rect {
  fill: rgba(99,179,237,0.1);
  stroke: var(--accent);
}
.edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
}
.edge-weight:hover .edit-icon {
  opacity: 1;
}
.edge-weight.editing .weight-rect {
  fill: rgba(99,179,237,0.15);
  stroke: var(--accent);
}

/* Попап редактирования веса */
.weight-edit-popup {
  position: absolute;
  z-index: 100;
  background: var(--bg-card2);
  border: 1px solid var(--accent);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
}

.popup-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
}

.popup-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.popup-input {
  flex: 1;
  padding: 6px 10px;
  background: var(--bg-input);
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  width: 70px;
  outline: none;
}

.popup-btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.popup-btn.ok {
  background: rgba(44,182,125,0.15);
  color: var(--accent3);
  border: 1px solid rgba(44,182,125,0.3);
}
.popup-btn.ok:hover {
  background: rgba(44,182,125,0.3);
}

.popup-btn.cancel {
  background: rgba(245,101,101,0.1);
  color: #f56565;
  border: 1px solid rgba(245,101,101,0.2);
}
.popup-btn.cancel:hover {
  background: rgba(245,101,101,0.25);
}

/* Подвал */
.canvas-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-card2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-stat {
  font-size: 13px;
  color: var(--text-secondary);
}
.stat-sep {
  margin: 0 10px;
  color: var(--border);
}

.edges-info-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.list-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
}

.badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.edge-info-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.edge-info-badge:hover {
  background: rgba(245,101,101,0.08);
  border-color: #f56565;
  color: #f56565;
}
.badge-delete {
  font-size: 13px;
  font-weight: bold;
  opacity: 0.5;
}
.edge-info-badge:hover .badge-delete {
  opacity: 1;
}

.empty-edges-text {
  font-size: 12px;
  color: var(--text-dim);
  font-style: italic;
}
</style>
