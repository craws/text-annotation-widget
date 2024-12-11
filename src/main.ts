import { createApp, ref } from 'vue'
import ProseMirrorEditor from './components/prose-mirror-editor.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

export function createTextAnnotationApp({ linkedEntities = [], sourceText = '' }) {
  const app = createApp({
    components: { ProseMirrorEditor },
    setup() {
      const linkedEntitiesRef = ref(linkedEntities)
      const sourceTextRef = ref(sourceText)

      return {
        linkedEntities: linkedEntitiesRef,
        sourceText: sourceTextRef,
      }
    },
    template: `
      <div>
        <ProseMirrorEditor
          :linked-entities="linkedEntities"
          :source-text="sourceText"
        />
      </div>
    `,
  })

  console.log('Vue App created, mounting...')
  app.mount('#app')
  return app
}
