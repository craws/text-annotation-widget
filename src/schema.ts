import { Schema, type NodeSpec, type MarkSpec } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { history } from "prosemirror-history";


// Define custom annotation mark (MarkSpec)
const annotationMark: MarkSpec = {
  attrs: {
    meta: { default: null },
  },
  toDOM: (mark) => {
    return [
      "mark",
      { meta: mark.attrs.meta },
      0,
    ];
  },
  parseDOM: [
    {
      tag: "mark[meta]",
      getAttrs: (dom) => {
        const meta = dom.getAttribute("meta");
        return { meta };
      },
    },
  ],
};

// Convert marks to plain objects
const marks: { [key: string]: MarkSpec } = {
  ...basicSchema.spec.marks,
  annotation: annotationMark,
};

const nodes: { [key: string]: NodeSpec } = {
  doc: { content: "block+" },
  paragraph: {
    ...basicSchema.spec.nodes.get("paragraph"),
    marks: "_",
    content: "inline*"
  },
  blockquote: {
    ...basicSchema.spec.nodes.get("blockquote"),
    marks: "_",
  },
  text: {
    ...basicSchema.spec.nodes.get("text"),
  },
  hard_break: {
    ...basicSchema.spec.nodes.get("hard_break"),
  },
};

// Create the schema
export const schema = new Schema({
  nodes,
  marks
});

export const keyBoardPlugins = {
  undoRedoKeymap: keymap({
    "Mod-z": undo,
    "Mod-Shift-z": redo,
  }),
  historyPlugin: history(),
  enterKeymap: keymap({
    "Enter": (state, dispatch) => {
      const { $from } = state.selection; // Current cursor position
      const parent = $from.node($from.depth);

      // Only handle cases in paragraphs or textblocks
      if (parent.type.name === "paragraph" || parent.isTextblock) {
        if (dispatch) {
          // Check if at the end of the parent node
          const atEnd = $from.parentOffset === $from.parent.content.size;

          const tr = atEnd
            ? state.tr.insert($from.pos, state.schema.nodes.hard_break.create()) // Insert hard_break at end
            : state.tr.replaceSelectionWith(state.schema.nodes.hard_break.create()); // Insert normally

          dispatch(tr.scrollIntoView());
        }
        return true; // Signal that Enter was handled
      }

      return false; // Let other handlers process it
    }
  }),
  backspaceKeymap: keymap({
    "Backspace": (state, dispatch) => {
      const { $from } = state.selection; // Current cursor position
      const parent = $from.node($from.depth); // Current parent node

      // Check if the parent is a paragraph
      if (parent.type.name === "paragraph") {
        console.log("Backspace entered in:", parent.type.name);

        // Case 1: Paragraph is empty
        if (parent.content.size === 0) {
          console.log("Backspace: Deleting empty paragraph");
          if (dispatch) {
            const tr = state.tr.delete($from.before(), $from.after());
            dispatch(tr);
          }
          return true; // Prevent default behavior
        }

        // Case 2: At the start of the paragraph
        if ($from.parentOffset === 0) {
          console.log("Backspace: At the start of the paragraph");
          // Prevent deletion of the paragraph itself, but handle cases like merging with the previous node
          if (dispatch) {
            const prevPos = $from.before($from.depth);
            const tr = state.tr.delete(prevPos - 1, $from.pos);
            dispatch(tr);
          }
          return true; // Prevent default behavior
        }
      }

      return false; // Allow default behavior for other cases
    }
  }),
}
