<script lang="ts" setup>
import ProseMirrorEditor from '../components/prose-mirror-editor.vue'
import entitiesData from '../linkedEntities.json'
import { type Entity } from '../types'

// Access the nested entities array
const entities = entitiesData.entities as Entity[]
</script>
<template>
  <div>
    <ProseMirrorEditor :linkedEntities="entities"></ProseMirrorEditor>
  </div>
</template>
