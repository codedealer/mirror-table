<script setup lang="ts">

</script>

<template>
  <va-card>
    <va-image
      src="https://via.placeholder.com/300x150"
      class=""
      :max-width="300"
      fit="cover"
      :ratio="2"
    />
    <va-card-title>Game Title</va-card-title>
    <va-card-content>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </va-card-content>
    <va-card-actions align="right">
      <va-button
        icon="edit"
        preset="primary"
        color="secondary-dark"
      />
      <va-button>Launch</va-button>
    </va-card-actions>
  </va-card>
</template>

<style scoped>

</style>
