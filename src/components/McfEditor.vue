<template>
  <div class="mcf-editor-card card">
    <div class="editor-layout">
      <!-- Панель управления графом -->
      <div class="editor-sidebar">
        <h3 class="panel-title">{{ t('mcf.panel_title') }}</h3>

        <!-- Пресеты -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('mcf.presets') }}</label>
          <div class="btn-group-row">
            <button class="btn btn-secondary btn-sm" @click="loadExample">
              {{ t('mcf.preset_example') }}
            </button>
            <button class="btn btn-secondary btn-sm" @click="generateRandom">
              {{ t('mcf.preset_random') }}
            </button>
            <button class="btn btn-ghost btn-sm text-danger" @click="clearGraph">
              {{ t('mcf.clear') }}
            </button>
          </div>
        </div>

        <!-- Пояснения по вершинам -->
        <div class="sidebar-section info-box">
          <div class="info-title">{{ t('mcf.info_title') }}</div>
          <ul class="info-list">
            <li><span class="badge-dot supply-dot"></span> <strong>{{ t('mcf.info_supply').split(':')[0] }}:</strong> {{ t('mcf.info_supply').split(':')[1] }}</li>
            <li><span class="badge-dot demand-dot"></span> <strong>{{ t('mcf.info_demand').split(':')[0] }}:</strong> {{ t('mcf.info_demand').split(':')[1] }}</li>
            <li><span class="badge-dot transit-dot"></span> <strong>{{ t('mcf.info_transit').split(':')[0] }}:</strong> {{ t('mcf.info_transit').split(':')[1] }}</li>
          </ul>
        </div>

        <!-- Добавление вершины -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('mcf.nodes') }}</label>
          <div class="add-node-row">
            <button class="btn btn-primary btn-sm w-full" @click="addNode" :disabled="nodes.length >= 10">
              {{ t('mcf.add_node') }} ({{ nextNodeLabel }})
            </button>
          </div>
          <p class="section-hint" v-if="nodes.length >= 10">{{ t('mcf.max_nodes') }}</p>
        </div>

        <!-- Добавление ребра -->
        <div class="sidebar-section">
          <label class="section-label">{{ t('mcf.add_edge') }}</label>
          <div class="edge-form">
            <div class="edge-nodes-select">
              <div class="select-wrapper">
                <select v-model="edgeForm.from" class="editor-select">
                  <option :value="null" disabled>{{ t('mcf.from') }}</option>
                  <option v-for="node in nodes" :key="`from-${node.id}`" :value="node.id">
                    {{ node.label }} ({{ node.value >= 0 ? '+' : '' }}{{ node.value }})
                  </option>
                </select>
              </div>
              <span class="edge-direction-arrow">→</span>
              <div class="select-wrapper">
                <select v-model="edgeForm.to" class="editor-select">
                  <option :value="null" disabled>{{ t('mcf.to') }}</option>
                  <option v-for="node in nodes" :key="`to-${node.id}`" :value="node.id">
                    {{ node.label }} ({{ node.value >= 0 ? '+' : '' }}{{ node.value }})
                  </option>
                </select>
              </div>
            </div>
            
            <div class="edge-inputs-row">
              <div class="input-wrap">
                <span class="input-prefix">c:</span>
                <input
                  type="number"
                  v-model.number="edgeForm.cost"
                  class="editor-input"
                  :placeholder="t('mcf.cost')"
                  min="0"
                  :title="t('mcf.cost')"
                />
              </div>
              <div class="input-wrap">
                <span class="input-prefix">u:</span>
                <input
                  type="number"
                  v-model.number="edgeForm.capacity"
                  class="editor-input"
                  :placeholder="t('mcf.capacity')"
                  min="1"
                  :title="t('mcf.capacity')"
                />
              </div>
              <button class="btn btn-secondary btn-sm" @click="addEdge">
                {{ t('mcf.add_edge_btn') }}
              </button>
            </div>
            <p v-if="edgeError" class="error-msg">{{ edgeError }}</p>
          </div>
        </div>

        <!-- Суммарный баланс -->
        <div class="sidebar-section balance-summary" :class="{ 'is-balanced': balanceDiff === 0 }">
          <label class="section-label">{{ t('mcf.balance') }}</label>
          <div class="balance-stats">
            <div>{{ t('mcf.production') }}: <strong class="text-success">{{ supplySum }}</strong></div>
            <div>{{ t('mcf.demand') }}: <strong class="text-danger">{{ demandSum }}</strong></div>
            <div class="balance-status" v-if="balanceDiff === 0">
              {{ t('mcf.balanced') }}
            </div>
            <div class="balance-status text-warning" v-else>
              {{ t('mcf.imbalance') }}: {{ balanceDiff > 0 ? '+' : '' }}{{ balanceDiff }}
            </div>
          </div>
        </div>

        <!-- Кнопка запуска -->
        <button
          class="btn btn-primary solve-trigger-btn"
          :disabled="nodes.length < 2"
          @click="triggerSolve"
        >
          {{ t('mcf.solve') }}
        </button>
      </div>

      <!-- Холст SVG с интерактивным графом -->
      <div class="editor-canvas-wrap">
        <div class="canvas-header">
          <span class="canvas-title">{{ t('mcf.canvas_title') }}</span>
          <span class="canvas-hint">{{ t('mcf.canvas_hint') }}</span>
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
            <!-- Маркеры стрелок -->
            <defs>
              <marker
                id="mcf-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255,255,255,0.4)" />
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
                <!-- Интерактивная невидимая толстая линия для удаления/выбора -->
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
                  stroke="rgba(255,255,255,0.25)"
                  stroke-width="2"
                  marker-end="url(#mcf-arrow)"
                  class="edge-line"
                />
                <!-- Кнопка удаления ребра -->
                <circle
                  :cx="edge.midX"
                  :cy="edge.midY"
                  r="9"
                  fill="#f56565"
                  class="edge-delete-btn"
                  @click="deleteEdge(edge.id)"
                />
                <text
                  :x="edge.midX"
                  :y="edge.midY + 3"
                  class="edge-delete-icon"
                  text-anchor="middle"
                  font-size="9"
                  fill="white"
                  font-weight="bold"
                  @click="deleteEdge(edge.id)"
                >×</text>

                <!-- Стоимость и Пропускная способность ребра -->
                <g
                  class="edge-weight"
                  :class="{ 'editing': editingEdgeId === edge.id }"
                  :transform="`translate(${edge.midX}, ${edge.midY - 18})`"
                  @click.stop="startEditWeight(edge.id, edge.cost, edge.capacity)"
                  title="Кликните, чтобы изменить стоимость и пропускную способность"
                >
                  <rect
                    x="-24"
                    y="-11"
                    width="48"
                    height="22"
                    rx="6"
                    :fill="editingEdgeId === edge.id ? 'rgba(99,179,237,0.15)' : 'var(--bg-card2)'"
                    :stroke="editingEdgeId === edge.id ? 'var(--accent)' : 'var(--border)'"
                    stroke-width="1.5"
                    class="weight-rect"
                  />
                  <text
                    y="4"
                    text-anchor="middle"
                    font-size="10"
                    font-weight="bold"
                    fill="var(--text-primary)"
                  >
                    c:{{ edge.cost }}|u:{{ edge.capacity }}
                  </text>
                </g>
              </g>
            </g>

            <!-- Вершины -->
            <g class="nodes-group">
              <g
                v-for="node in nodes"
                :key="`nd-${node.id}`"
                class="node-group"
                :class="nodeClass(node)"
                :transform="`translate(${node.x}, ${node.y})`"
                @mousedown="onNodeMouseDown(node.id, $event)"
              >
                <!-- Задний круг -->
                <circle
                  r="25"
                  fill="var(--bg-card2)"
                  :stroke="nodeStroke(node)"
                  stroke-width="2.5"
                  class="node-bg"
                />
                <!-- Внутренний круг -->
                <circle
                  r="22"
                  :fill="nodeInnerFill(node)"
                />
                <!-- Буква вершины -->
                <text
                  text-anchor="middle"
                  y="-4"
                  font-size="14"
                  font-weight="bold"
                  fill="var(--text-primary)"
                  class="node-text"
                >
                  {{ node.label }}
                </text>
                <!-- Величина вершины (баланс) -->
                <g class="node-value-g" @click.stop="startEditNodeValue(node.id, node.value)">
                  <text
                    text-anchor="middle"
                    y="12"
                    font-size="10"
                    font-weight="800"
                    :fill="nodeValueColor(node)"
                    class="node-value-text"
                  >
                    {{ node.value > 0 ? '+' : '' }}{{ node.value }}
                  </text>
                </g>
                <!-- Кнопка удаления вершины -->
                <g class="node-delete-g" @click.stop="deleteNode(node.id)">
                  <circle cx="18" cy="-18" r="7" fill="#f56565" />
                  <text cx="18" cy="-18" x="18" y="-15" text-anchor="middle" font-size="9" fill="white" font-weight="bold">×</text>
                </g>
              </g>
            </g>
          </svg>

          <!-- Попап редактирования параметров ребра (cost / capacity) -->
          <div
            v-if="editingEdgeId !== null && editPopupPos"
            class="weight-edit-popup"
            :style="{ left: editPopupPos.x + 'px', top: editPopupPos.y + 'px' }"
            @click.stop
          >
            <label class="popup-label">{{ t('mcf.edge_params') }}</label>
            <div class="popup-inputs-column">
              <div class="popup-input-row">
                <span class="popup-input-prefix">{{ t('mcf.edge_cost_label') }}</span>
                <input
                  ref="costInputRef"
                  type="number"
                  v-model.number="editCostValue"
                  class="popup-input"
                  min="0"
                  @keydown.enter="confirmEditWeight"
                  @keydown.esc="cancelEditWeight"
                />
              </div>
              <div class="popup-input-row">
                <span class="popup-input-prefix">{{ t('mcf.edge_cap_label') }}</span>
                <input
                  type="number"
                  v-model.number="editCapacityValue"
                  class="popup-input"
                  min="1"
                  @keydown.enter="confirmEditWeight"
                  @keydown.esc="cancelEditWeight"
                />
              </div>
              <div class="popup-actions">
                <button class="popup-btn ok" @click="confirmEditWeight">{{ t('mcf.accept') }}</button>
                <button class="popup-btn cancel" @click="cancelEditWeight">✕</button>
              </div>
            </div>
          </div>

          <!-- Попап редактирования баланса вершины -->
          <div
            v-if="editingNodeId !== null && nodePopupPos"
            class="weight-edit-popup node-edit-popup"
            :style="{ left: nodePopupPos.x + 'px', top: nodePopupPos.y + 'px' }"
            @click.stop
          >
            <label class="popup-label">{{ t('mcf.node_value_label') }} {{ editingNodeLabel }}:</label>
            <p class="popup-help-text">(>0 - источник, &lt;0 - потребность, 0 - транзит)</p>
            <div class="popup-row">
              <input
                ref="nodeValueInputRef"
                type="number"
                v-model.number="editNodeValue"
                class="popup-input node-val-input"
                @keydown.enter="confirmEditNodeValue"
                @keydown.esc="cancelEditNodeValue"
              />
              <button class="popup-btn ok" @click="confirmEditNodeValue">✓</button>
              <button class="popup-btn cancel" @click="cancelEditNodeValue">✕</button>
            </div>
          </div>
        </div>

        <!-- Подвал холста -->
        <div class="canvas-footer card-inner-list">
          <div class="footer-stat">
            <span>{{ t('mcf.nodes_count') }}: <strong>{{ nodes.length }}</strong></span>
            <span class="stat-sep">|</span>
            <span>{{ t('mcf.edges_count') }}: <strong>{{ edges.length }}</strong></span>
          </div>
          <div class="edges-info-list" v-if="edges.length > 0">
            <span class="list-title">{{ t('mcf.channels') }}</span>
            <div class="badges-row">
              <span
                v-for="edge in edgeLines"
                :key="`b-${edge.id}`"
                class="edge-info-badge"
                @click="deleteEdge(edge.id)"
                title="Нажмите, чтобы удалить ребро"
              >
                {{ edge.fromLabel }} → {{ edge.toLabel }} ({{ t('mcf.cost') }}: {{ edge.cost }}, {{ t('mcf.capacity') }}: {{ edge.capacity }})
                <span class="badge-delete">×</span>
              </span>
            </div>
          </div>
          <div v-else class="empty-edges-text">{{ t('mcf.empty_edges') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { t } from '../locale'
import type { McfNode, McfEdge } from '../core/mincostflow'

const emit = defineEmits<{
  (e: 'solve', data: { nodes: McfNode[]; edges: McfEdge[] }): void
}>()

// Состояние
const nodes = ref<McfNode[]>([])
const edges = ref<McfEdge[]>([])

// Форма добавления ребра
const edgeForm = ref<{ from: number | null; to: number | null; cost: number; capacity: number }>({
  from: null,
  to: null,
  cost: 4,
  capacity: 10
})
const edgeError = ref<string>('')

// Ссылка на элемент SVG для перетаскивания
const svgRef = ref<SVGSVGElement | null>(null)
const isDragging = ref(false)
const draggedNodeId = ref<number | null>(null)

// Инлайн-редактирование ребра
const editingEdgeId = ref<number | null>(null)
const editCostValue = ref<number>(1)
const editCapacityValue = ref<number>(10)
const editPopupPos = ref<{ x: number; y: number } | null>(null)
const costInputRef = ref<HTMLInputElement | null>(null)

// Инлайн-редактирование вершины
const editingNodeId = ref<number | null>(null)
const editingNodeLabel = ref<string>('')
const editNodeValue = ref<number>(0)
const nodePopupPos = ref<{ x: number; y: number } | null>(null)
const nodeValueInputRef = ref<HTMLInputElement | null>(null)

// Генерация буквенных меток
const nextNodeLabel = computed(() => {
  return String.fromCharCode(65 + nodes.value.length)
})

// Подсчет сумм
const supplySum = computed(() => nodes.value.reduce((acc, n) => n.value > 0 ? acc + n.value : acc, 0))
const demandSum = computed(() => nodes.value.reduce((acc, n) => n.value < 0 ? acc - n.value : acc, 0))
const balanceDiff = computed(() => supplySum.value - demandSum.value)

// Преобразование ребер в экранные линии
const edgeLines = computed(() => {
  const r = 25 // Радиус вершины
  return edges.value.map(e => {
    const fromNode = nodes.value.find(n => n.id === e.from)
    const toNode = nodes.value.find(n => n.id === e.to)
    if (!fromNode || !toNode) {
      return { id: e.id, x1: 0, y1: 0, x2: 0, y2: 0, midX: 0, midY: 0, cost: e.cost, capacity: e.capacity, fromLabel: '', toLabel: '' }
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
      x1 = Math.round(fromNode.x + r * udx)
      y1 = Math.round(fromNode.y + r * udy)
      x2 = Math.round(toNode.x - r * udx)
      y2 = Math.round(toNode.y - r * udy)
    }

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
      cost: e.cost,
      capacity: e.capacity,
      fromLabel: fromNode.label,
      toLabel: toNode.label
    }
  })
})

// Стилизация вершин
function nodeClass(node: McfNode) {
  return {
    'node-supply': node.value > 0,
    'node-demand': node.value < 0,
    'node-transit': node.value === 0
  }
}
function nodeStroke(node: McfNode): string {
  if (node.value > 0) return 'var(--accent3)' // Зеленый для источников
  if (node.value < 0) return '#e53e3e' // Красный для стоков
  return 'rgba(255,255,255,0.2)'
}
function nodeInnerFill(node: McfNode): string {
  if (node.value > 0) return 'rgba(44,182,125,0.08)'
  if (node.value < 0) return 'rgba(229,62,62,0.08)'
  return 'var(--bg-input)'
}
function nodeValueColor(node: McfNode): string {
  if (node.value > 0) return 'var(--accent3)'
  if (node.value < 0) return '#f56565'
  return 'var(--text-dim)'
}

// Загрузка классического примера
function loadExample() {
  nodes.value = [
    { id: 0, label: 'A', x: 150, y: 150, value: 12 },  // Источник
    { id: 1, label: 'B', x: 150, y: 300, value: 8 },   // Источник
    { id: 2, label: 'C', x: 400, y: 225, value: 0 },   // Транзит
    { id: 3, label: 'D', x: 650, y: 150, value: -10 }, // Сток
    { id: 4, label: 'E', x: 650, y: 300, value: -10 }  // Сток
  ]
  edges.value = [
    { id: 0, from: 0, to: 2, cost: 2, capacity: 10 },
    { id: 1, from: 0, to: 3, cost: 6, capacity: 5 },
    { id: 2, from: 1, to: 2, cost: 3, capacity: 8 },
    { id: 3, from: 2, to: 3, cost: 1, capacity: 7 },
    { id: 4, from: 2, to: 4, cost: 4, capacity: 15 },
    { id: 5, from: 1, to: 4, cost: 7, capacity: 6 }
  ]
  cancelEditNodeValue()
  cancelEditWeight()
  edgeError.value = ''
}

// Генерация случайной сбалансированной сети
function generateRandom() {
  const cx = 400, cy = 225
  const newNodes: McfNode[] = [
    { id: 0, label: 'A', x: 150, y: 120, value: 15 },
    { id: 1, label: 'B', x: 150, y: 320, value: 10 },
    { id: 2, label: 'C', x: 380, y: 120, value: 0 },
    { id: 3, label: 'D', x: 380, y: 320, value: 0 },
    { id: 4, label: 'E', x: 650, y: 120, value: -12 },
    { id: 5, label: 'F', x: 650, y: 320, value: -13 }
  ]

  const newEdges: McfEdge[] = [
    { id: 0, from: 0, to: 2, cost: 2, capacity: 15 },
    { id: 1, from: 0, to: 3, cost: 4, capacity: 10 },
    { id: 2, from: 1, to: 3, cost: 1, capacity: 12 },
    { id: 3, from: 2, to: 4, cost: 3, capacity: 10 },
    { id: 4, from: 2, to: 5, cost: 5, capacity: 8 },
    { id: 5, from: 3, to: 4, cost: 2, capacity: 12 },
    { id: 6, from: 3, to: 5, cost: 3, capacity: 15 }
  ]

  nodes.value = newNodes
  edges.value = newEdges
  cancelEditNodeValue()
  cancelEditWeight()
  edgeError.value = ''
}

function clearGraph() {
  nodes.value = []
  edges.value = []
  edgeError.value = ''
  cancelEditNodeValue()
  cancelEditWeight()
}

// Добавление вершины
function addNode() {
  if (nodes.value.length >= 10) return
  const id = nodes.value.length > 0 ? Math.max(...nodes.value.map(n => n.id)) + 1 : 0
  const angle = (nodes.value.length * 48 * Math.PI) / 180
  const x = Math.round(cxForIndex(nodes.value.length))
  const y = Math.round(cyForIndex(nodes.value.length))

  nodes.value.push({
    id,
    label: nextNodeLabel.value,
    x,
    y,
    value: 0 // По умолчанию транзит
  })
}

function cxForIndex(idx: number) {
  if (idx < 3) return 150
  if (idx < 6) return 400
  return 650
}
function cyForIndex(idx: number) {
  return 100 + (idx % 3) * 120
}

// Удаление вершины
function deleteNode(id: number) {
  nodes.value = nodes.value.filter(n => n.id !== id)
  edges.value = edges.value.filter(e => e.from !== id && e.to !== id)
  
  nodes.value.forEach((n, idx) => {
    n.label = String.fromCharCode(65 + idx)
  })
  
  if (editingNodeId.value === id) cancelEditNodeValue()
}

// Добавление ребра
function addEdge() {
  edgeError.value = ''
  const { from, to, cost, capacity } = edgeForm.value
  
  if (from === null || to === null) {
    edgeError.value = 'Выберите оба узла'
    return
  }
  if (from === to) {
    edgeError.value = 'Нельзя соединить узел с самим собой'
    return
  }
  if (cost < 0) {
    edgeError.value = 'Стоимость должна быть неотрицательной'
    return
  }
  if (capacity < 1) {
    edgeError.value = 'Пропускная способность должна быть больше 0'
    return
  }

  // Проверка на дубликат
  const exists = edges.value.some(e => e.from === from && e.to === to)
  if (exists) {
    edgeError.value = 'Канал в этом направлении уже создан'
    return
  }

  const nextEdgeId = edges.value.length > 0 ? Math.max(...edges.value.map(e => e.id)) + 1 : 0
  edges.value.push({
    id: nextEdgeId,
    from,
    to,
    cost,
    capacity
  })

  edgeForm.value.from = null
  edgeForm.value.to = null
}

function deleteEdge(id: number) {
  edges.value = edges.value.filter(e => e.id !== id)
  if (editingEdgeId.value === id) cancelEditWeight()
}

// Редактирование веса/емкости ребра
function startEditWeight(edgeId: number, currentCost: number, currentCap: number) {
  if (!svgRef.value) return
  const svgRect = svgRef.value.getBoundingClientRect()
  const containerRect = svgRef.value.parentElement!.getBoundingClientRect()
  
  const edgeLine = edgeLines.value.find(e => e.id === edgeId)
  if (!edgeLine) return

  const scaleX = svgRect.width / 800
  const scaleY = svgRect.height / 450
  const screenX = svgRect.left - containerRect.left + edgeLine.midX * scaleX
  const screenY = svgRect.top - containerRect.top + (edgeLine.midY - 18) * scaleY

  editingEdgeId.value = edgeId
  editCostValue.value = currentCost
  editCapacityValue.value = currentCap
  editPopupPos.value = { x: Math.round(screenX - 85), y: Math.round(screenY - 80) }
  
  setTimeout(() => costInputRef.value?.focus(), 50)
}

function confirmEditWeight() {
  if (editingEdgeId.value === null) return
  const cost = Number(editCostValue.value)
  const cap = Number(editCapacityValue.value)
  if (!isNaN(cost) && cost >= 0 && !isNaN(cap) && cap >= 1) {
    const edge = edges.value.find(e => e.id === editingEdgeId.value)
    if (edge) {
      edge.cost = cost
      edge.capacity = cap
    }
  }
  cancelEditWeight()
}

function cancelEditWeight() {
  editingEdgeId.value = null
  editPopupPos.value = null
}

// Редактирование баланса вершины
function startEditNodeValue(nodeId: number, currentValue: number) {
  if (!svgRef.value) return
  const svgRect = svgRef.value.getBoundingClientRect()
  const containerRect = svgRef.value.parentElement!.getBoundingClientRect()

  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return

  const scaleX = svgRect.width / 800
  const scaleY = svgRect.height / 450
  const screenX = svgRect.left - containerRect.left + node.x * scaleX
  const screenY = svgRect.top - containerRect.top + node.y * scaleY

  editingNodeId.value = nodeId
  editingNodeLabel.value = node.label
  editNodeValue.value = currentValue
  nodePopupPos.value = { x: Math.round(screenX - 80), y: Math.round(screenY + 30) }

  setTimeout(() => nodeValueInputRef.value?.focus(), 50)
}

function confirmEditNodeValue() {
  if (editingNodeId.value === null) return
  const v = Number(editNodeValue.value)
  const node = nodes.value.find(n => n.id === editingNodeId.value)
  if (node && !isNaN(v)) {
    node.value = v
  }
  cancelEditNodeValue()
}

function cancelEditNodeValue() {
  editingNodeId.value = null
  nodePopupPos.value = null
}

// SVG Dragging
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
  cancelEditNodeValue()
  cancelEditWeight()
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value || draggedNodeId.value === null) return
  const coords = getSVGCoords(event)
  const node = nodes.value.find(n => n.id === draggedNodeId.value)
  if (node) {
    node.x = Math.max(35, Math.min(765, coords.x))
    node.y = Math.max(35, Math.min(415, coords.y))
  }
}

function onMouseUp() {
  isDragging.value = false
  draggedNodeId.value = null
}

function triggerSolve() {
  if (nodes.value.length < 2) return
  emit('solve', {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  })
}

onMounted(() => {
  loadExample()
})
</script>

<style scoped>
.mcf-editor-card {
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.editor-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  min-height: 540px;
}

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

.editor-sidebar {
  padding: 24px;
  background: var(--bg-card2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-hint {
  font-size: 11px;
  color: var(--text-dim);
}

.btn-group-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.info-box {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
}
.info-title {
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.info-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.supply-dot { background: var(--accent3); }
.demand-dot { background: #e53e3e; }
.transit-dot { background: var(--text-dim); }

.edge-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edge-nodes-select {
  display: flex;
  align-items: center;
  gap: 6px;
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
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.editor-select {
  width: 100%;
  padding: 7px 20px 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12px;
  appearance: none;
  cursor: pointer;
}
.edge-inputs-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 8px;
  flex: 1;
}
.input-prefix {
  font-size: 11px;
  color: var(--text-dim);
  font-weight: 700;
  margin-right: 4px;
}
.input-wrap input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12px;
  padding: 7px 0;
  outline: none;
}

.balance-summary {
  background: rgba(255,255,255,0.01);
  border: 1px dashed var(--border);
  padding: 12px;
  border-radius: 8px;
}
.balance-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.balance-status {
  font-size: 11px;
  font-weight: 700;
  margin-top: 4px;
}

.solve-trigger-btn {
  margin-top: auto;
  font-weight: 700;
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

/* Элементы графа */
.node-group {
  cursor: grab;
}
.node-text {
  pointer-events: none;
}
.node-value-g {
  cursor: pointer;
}
.node-delete-g {
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}
.node-group:hover .node-delete-g {
  opacity: 1;
}

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
}
.edge-weight .weight-rect {
  transition: fill 0.2s, stroke 0.2s;
}
.edge-weight:hover .weight-rect {
  fill: rgba(99,179,237,0.1);
  stroke: var(--accent);
}

/* Попап */
.weight-edit-popup {
  position: absolute;
  z-index: 100;
  background: var(--bg-card2);
  border: 1px solid var(--accent);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
}
.popup-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
}
.popup-help-text {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: -4px;
}
.popup-inputs-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.popup-input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.popup-input-prefix {
  font-size: 12px;
  color: var(--text-secondary);
}
.popup-input {
  width: 70px;
  padding: 5px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  outline: none;
}
.popup-input:focus {
  border-color: var(--accent);
}
.popup-row {
  display: flex;
  gap: 6px;
}
.popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}
.popup-btn {
  padding: 5px 10px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.popup-btn.ok {
  background: rgba(44,182,125,0.15);
  color: var(--accent3);
}
.popup-btn.cancel {
  background: rgba(245,101,101,0.1);
  color: #f56565;
}

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
  opacity: 0.5;
  font-weight: bold;
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
