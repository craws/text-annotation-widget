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
import { DOMSerializer } from 'prosemirror-model'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'
import { onMounted, ref, toRaw, nextTick } from 'vue'
import { Button } from '../components/ui/button'
import { schema, keyBoardPlugins } from '../schema'
import { Plugin } from 'prosemirror-state'
import { Transaction } from 'prosemirror-state'
import { type Entity } from '../types'
import { CircleAlertIcon, Trash2Icon, PencilIcon } from 'lucide-vue-next'
import EditorPopup from './editor-popup.vue'
import '../assets/editor.css'

const props = defineProps<{
  linkedEntities: Array<Entity>
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const editorView = ref<EditorView | null>(null)
const sourceText = ref('ijwekjdwejdwegkhdkhgwedhkwedwedgk')
const annotationSelected = ref(false)
const selectionRange = ref<{ from: number; to: number } | null>(null)
const errorMessage = ref('')
const errorOccured = ref(false)

const annotations = ref<
  { annotationText: string; from: number; to: number; id: string; description: string }[]
>([])
const currentEditAnnotation = ref<{
  annotationText: string
  from: number
  to: number
  id: string
  description: string
} | null>(null)

// Save as HTML
const saveToHTMLFile = () => {
  if (editorView.value === null) return

  const { doc } = editorView.value.state
  const serializer = DOMSerializer.fromSchema(schema)
  const domFragment = serializer.serializeFragment(doc.content)

  const tempDiv = document.createElement('div')
  tempDiv.appendChild(domFragment)
  const htmlContent = tempDiv.innerHTML
  console.log(htmlContent)
}

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

const handleAddAnnotation = ({ id, description }: { id: string; description: string }) => {
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
      description,
    })

    const tr = state.tr.addMark(from, to, schema.marks.annotation.create({ meta }))

    annotations.value.push({
      annotationText: selectedText,
      from: from,
      to: to,
      id: id,
      description: description,
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
    description: annotation.description,
  }

  annotationSelected.value = true
}

// Handle saving the edited annotation
const handleEditAnnotation = (updatedAnnotation: {
  id: string
  description: string
  annotationText: string
}) => {
  if (currentEditAnnotation.value != null) {
    // Update the annotation in the array
    currentEditAnnotation.value.id = updatedAnnotation.id
    currentEditAnnotation.value.description = updatedAnnotation.description
    currentEditAnnotation.value.annotationText = updatedAnnotation.annotationText

    const annotationIndex = annotations.value.findIndex(
      (annotation) => annotation.id === currentEditAnnotation.value!.id,
    )

    if (annotationIndex !== -1) {
      annotations.value[annotationIndex] = {
        ...annotations.value[annotationIndex],
        ...updatedAnnotation,
      }
    }

    // Close the popup after saving
    annotationSelected.value = false

    // Optionally: Update the editor view if necessary
    updateEditorAnnotation(currentEditAnnotation.value)
  }
}

// Update the editor view with the new annotation
const updateEditorAnnotation = (annotation: any) => {
  if (editorView.value === null) return

  const state = toRaw(editorView.value.state)

  // Update mark based on the new annotation
  const mark = schema.marks.annotation.create({
    meta: JSON.stringify({
      id: annotation.id,
      description: annotation.description,
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
    description: string
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
              description: meta.description,
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

onMounted(async () => {
  await nextTick()

  if (sourceText.value) {
    const parser = new window.DOMParser()
    const parsedDoc = parser.parseFromString(sourceText.value, 'text/html')
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
      ],
    })

    if (editorRef.value) {
      editorView.value = new EditorView(editorRef.value, {
        state,
      })

      extractAnnotations(doc)
    }
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
    <!-- ProseMirror Editor -->
    <div class="border" id="editor" ref="editorRef"></div>

    <div v-if="errorOccured" class="pt-2 flex items-center text-red-600 font-semibold text-sm">
      <CircleAlertIcon class="mr-1" :size="16" />
      <span> Error: {{ errorMessage }} </span>
    </div>
    <h2 class="py-2 font-semibold">Annotations</h2>

    <div class="pb-2" v-if="annotations.length > 0">
      <ul class="space-y-4 mt-2">
        <li
          v-for="(annotation, index) in annotations"
          :key="annotation.id"
          class="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
        >
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-700">{{ annotation.annotationText }}</p>
            <p class="text-xs text-gray-500">
              Entity ID: {{ annotation.id }} | Description: {{ annotation.description }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 hover:text-blue-700 text-blue-500 transition-colors"
              @click="editAnnotation(index)"
            >
              <PencilIcon :size="16" />
            </button>
            <button
              class="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
              @click="removeAnnotation(index)"
            >
              <Trash2Icon :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="text-sm text-gray-500">No annotations have been added yet.</div>
    <div class="pb-2 text-sm text-gray-500" v-else>No annotations have been added yet.</div>
    <div class="py-2">
      <div>
        <Button @click="saveToHTMLFile()">Save</Button>
        <EditorPopup
          @add-annotation="handleAddAnnotation"
          @cancel-annotation="handleCancelAnnotation"
          :triggerAnnotation="annotationSelected"
          :entities="props.linkedEntities"
          :annotation="currentEditAnnotation"
          @edit-annotation="handleEditAnnotation"
        />
      </div>
    </div>
  </div>
</template>
