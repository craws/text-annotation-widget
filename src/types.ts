import { EditorState, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

export interface Entity {
  id: number
  name: string
}

export interface MenuItem {
  command: (state: EditorState, dispatch: (tr: Transaction) => void, view: EditorView) => boolean
  dom: HTMLElement
}

export interface Annotation {
  id: string
  annotationText: string
  from: number
  to: number
  entityId?: string
  comment?: string
}
