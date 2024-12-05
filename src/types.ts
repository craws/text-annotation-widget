import { EditorState, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

export interface Entity {
  id: number
  name: string
}

export interface MenuItem {
  command: (state: EditorState, dispatch: (tr: Transaction) => void, view: EditorView) => boolean // The ProseMirror command to execute when clicked
  dom: HTMLElement // The DOM element representing the button in the toolbar
}

export interface Annotation {
  id: number
  description: string
}
