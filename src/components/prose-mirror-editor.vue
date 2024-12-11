<script lang="ts">
import { type MenuItem } from '../types'

const MenuView = class {
  items: MenuItem[]
  editorView: EditorView
  dom: HTMLElement

  constructor(items: MenuItem[], editorView: EditorView) {
    this.items = items
    this.editorView = editorView

    this.dom = document.createElement('div')
    this.dom.className = 'menubar'
    items.forEach(({ dom }) => this.dom.appendChild(dom))

    this.dom.addEventListener('mousedown', (e) => {
      e.preventDefault()
      editorView.focus()
      items.forEach(({ command, dom }) => {
        if (dom.contains(e.target as HTMLElement))
          command(editorView.state, editorView.dispatch, editorView)
      })
    })
  }
}
</script>

<script lang="ts" setup>
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'
import { onMounted, ref, toRaw, nextTick } from 'vue'
import { PencilIcon, Trash2Icon } from 'lucide-vue-next'
import { schema, keyBoardPlugins } from '../schema'
import { Plugin } from 'prosemirror-state'
import { Transaction } from 'prosemirror-state'
import { type Entity } from '../types'
import EditorPopup from './editor-popup.vue'
import '../assets/editor.css'

const props = defineProps<{
  linkedEntities: Array<Entity>
  sourceText: string
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const editorView = ref<EditorView | null>(null)
const annotationSelected = ref(false)
const selectionRange = ref<{ from: number; to: number } | null>(null)
const errorMessage = ref('')
const errorOccured = ref(false)

const annotations = ref<
  { annotationText: string; from: number; to: number; id: string; comment: string }[]
>([])

const currentEditAnnotation = ref<{
  annotationText: string
  from: number
  to: number
  id: string
  comment: string
} | null>(null)

// Make a custom menu
const menuPlugin = (items: MenuItem[]) => {
  return new Plugin({
    view(editorView) {
      const menuView = new MenuView(items, editorView)
      console.log('MenuView: ', menuView)
      if (editorView.dom.parentNode != null) {
        editorView.dom.parentNode.insertBefore(menuView.dom, editorView.dom)
      }
      return menuView
    },
  })
}

const annotateButton = {
  command: (state: EditorState, dispatch: (tr: Transaction) => void, view: EditorView) => {
    const { from, to } = state.selection
    selectionRange.value = { from, to }

    if (state.selection.empty) {
      handleError('Please select text to annotate.')
      return false
    }

    let overlapping = false

    state.doc.nodesBetween(from, to, (node) => {
      if (node.marks.some((mark) => mark.type === schema.marks.annotation)) {
        overlapping = true
        return false
      }
    })

    if (overlapping) {
      handleError('Cannot add annotation: Overlapping annotation detected.')
      return false
    }

    annotationSelected.value = true

    return true
  },
  dom: icon('Annotate', 'annotate'),
}

function icon(text: string, name: string) {
  const span = document.createElement('span')
  span.className = 'menuicon ' + name
  span.title = name
  span.textContent = text
  span.style.cursor = 'pointer'
  return span
}

const handleAddAnnotation = ({ id, comment }: { id: string; comment: string }) => {
  try {
    if (!selectionRange.value || !editorView.value) {
      handleError('Editor view or selection range is not available.')
      return
    }

    const state = toRaw(editorView.value.state)
    const { from, to } = selectionRange.value
    const selectedText = state.doc.textBetween(from, to, ' ')

    if (from === to || from < 0 || to > state.doc.content.size) {
      handleError('Invalid selection range.')
      return
    }

    const meta = JSON.stringify({
      id,
      comment,
    })

    const tr = state.tr.addMark(from, to, schema.marks.annotation.create({ meta }))

    annotations.value.push({
      annotationText: selectedText,
      from: from,
      to: to,
      id: id,
      comment: comment,
    })
    editorView.value.dispatch(tr)

    annotationSelected.value = false
    selectionRange.value = null
  } catch (error) {
    handleError(`Add annotation: ${error}`)
  }
}

const handleCancelAnnotation = () => {
  annotationSelected.value = false
  selectionRange.value = null
  currentEditAnnotation.value = null
}

const editAnnotation = (index: number) => {
  const annotation = annotations.value[index]
  currentEditAnnotation.value = {
    annotationText: annotation.annotationText,
    from: annotation.from,
    to: annotation.to,
    id: annotation.id,
    comment: annotation.comment,
  }

  annotationSelected.value = true
}

// Handle saving the edited annotation
const handleEditAnnotation = (updatedAnnotation: { id: string; comment: string }) => {
  if (currentEditAnnotation.value != null) {
    // Update the annotation in the array
    const originalId = currentEditAnnotation.value.id

    currentEditAnnotation.value.id = updatedAnnotation.id
    currentEditAnnotation.value.comment = updatedAnnotation.comment

    const annotationIndex = annotations.value.findIndex(
      (annotation) => annotation.id === originalId,
    )

    if (annotationIndex !== -1) {
      annotations.value[annotationIndex] = {
        ...annotations.value[annotationIndex],
        ...updatedAnnotation,
      }
    }

    annotationSelected.value = false

    updateEditorAnnotation(currentEditAnnotation.value)
  }
}

// Update the editor view with the new annotation
const updateEditorAnnotation = (annotation: any) => {
  if (editorView.value === null) return

  const state = toRaw(editorView.value.state)

  const mark = schema.marks.annotation.create({
    meta: JSON.stringify({
      id: annotation.id,
      comment: annotation.comment,
    }),
  })

  const tr = state.tr.removeMark(annotation.from, annotation.to, schema.marks.annotation)

  tr.addMark(annotation.from, annotation.to, mark)
  editorView.value.dispatch(tr)
  currentEditAnnotation.value = null
}

const removeAnnotation = (index: number) => {
  const annotation = annotations.value[index]

  if (editorView.value === null) return

  const state = toRaw(editorView.value.state)
  const tr = state.tr.removeMark(annotation.from, annotation.to, schema.marks.annotation)

  editorView.value.dispatch(tr)

  annotations.value.splice(index, 1)
}

const extractAnnotations = (doc: any) => {
  const annotationsArray: {
    annotationText: string
    from: number
    to: number
    id: string
    comment: string
  }[] = []

  doc.descendants((node: any, pos: number) => {
    if (node.marks && node.marks.length > 0) {
      node.marks.forEach((mark: any) => {
        if (mark.type === schema.marks.annotation) {
          try {
            const meta = JSON.parse(mark.attrs.meta)
            annotationsArray.push({
              annotationText: doc.textBetween(pos, pos + node.nodeSize, ' '),
              from: pos,
              to: pos + node.nodeSize,
              id: meta.id,
              comment: meta.comment,
            })
          } catch (error) {
            handleError(`Failed to parse annotation meta data: ${error}.`)
          }
        }
      })
    }
  })

  // Update the annotations array
  annotations.value = annotationsArray
}

const updateAnnotationPositions = () => {
  if (!editorView.value) return

  const state = toRaw(editorView.value.state)
  const newAnnotations: typeof annotations.value = []

  state.doc.descendants((node, pos) => {
    if (node.marks && node.marks.length > 0) {
      node.marks.forEach((mark) => {
        if (mark.type === schema.marks.annotation) {
          try {
            const meta = JSON.parse(mark.attrs.meta)
            newAnnotations.push({
              annotationText: node.text || state.doc.textBetween(pos, pos + node.nodeSize, ' '),
              from: pos,
              to: pos + node.nodeSize,
              id: meta.id,
              comment: meta.comment,
            })
          } catch (error) {
            console.error('Error updating annotation positions:', error)
          }
        }
      })
    }
  })

  annotations.value = newAnnotations
}

onMounted(async () => {
  await nextTick()

  const parser = new window.DOMParser()
  const parsedDoc = parser.parseFromString(props.sourceText, 'text/html')
  const doc = ProseMirrorDOMParser.fromSchema(schema).parse(parsedDoc.body)

  const state = EditorState.create({
    schema: schema,
    doc: doc,
    plugins: [
      menuPlugin([annotateButton]),
      keyBoardPlugins.historyPlugin,
      keyBoardPlugins.undoRedoKeymap,
      keyBoardPlugins.enterKeymap,
      keyBoardPlugins.backspaceKeymap,
      new Plugin({
        view(view) {
          return {
            update: () => {
              updateAnnotationPositions()
            },
          }
        },
      }),
    ],
  })

  if (editorRef.value) {
    editorView.value = new EditorView(editorRef.value, {
      state,
    })

    extractAnnotations(doc)
  }
})

const handleError = (message: string) => {
  errorMessage.value = message
  errorOccured.value = true

  setTimeout(() => {
    errorOccured.value = false
    errorMessage.value = ''
  }, 5000)
}
</script>

<template>
  <div>
    <div id="editor" ref="editorRef" class="border p-3 mb-3"></div>

    <div v-if="errorOccured" class="text-danger d-flex">
      <span>{{ errorMessage }}</span>
    </div>

    <h2 class="y-4 fs-6 fw-bold">Annotations</h2>

    <div class="pb-2" v-if="annotations.length > 0">
      <ul class="list-unstyled mt-2">
        <li
          v-for="(annotation, index) in annotations"
          :key="annotation.id"
          class="d-flex justify-content-between align-items-center p-4 bg-light border rounded-lg shadow-sm hover-bg-light transition-colors"
        >
          <div class="flex-grow-1">
            <p class="mb-1 fw-bold">{{ annotation.annotationText }}</p>
            <p class="text-muted mb-0 small">
              {{
                [
                  annotation.id != null ? `Entity ID: ${annotation.id}` : null,
                  annotation.comment != null ? `Comment: ${annotation.comment}` : null,
                ]
                  .filter(Boolean)
                  .join(' | ')
              }}
            </p>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button
              type="button"
              class="button-hover d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 p-2 text-primary transition"
              @click="editAnnotation(index)"
            >
              <PencilIcon :size="16" />
            </button>
            <button
              type="button"
              class="button-hover d-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 p-2 text-danger transition"
              @click="removeAnnotation(index)"
            >
              <Trash2Icon :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="text-muted fs-6">No annotations have been added yet.</div>

    <div>
      <EditorPopup
        @add-annotation="handleAddAnnotation"
        @cancel-annotation="handleCancelAnnotation"
        :triggerAnnotation="annotationSelected"
        :entities="props.linkedEntities"
        :annotation="currentEditAnnotation ?? undefined"
        @edit-annotation="handleEditAnnotation"
      />
    </div>
  </div>
</template>
