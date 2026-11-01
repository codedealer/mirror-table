<script setup lang="ts">
import { MockImageRepository } from '~/utils/image-framing/mock';

// Repository survives the harness remount but not a page refresh or navigation away.
const repository = new MockImageRepository();
const ready = ref(false);
const fixtureIds = ref<string[]>([]);
const mountKey = ref(0);
const committedId = ref('');
const rejectPersistence = ref(false);

async function persistParentSelection(_id: string) {
  // Simulate an asynchronous parent write; failures never publish the new committed ID.
  await new Promise(resolve => setTimeout(resolve, 300));
  if (rejectPersistence.value)
    throw new Error('Simulated parent persistence rejection.');
}

onMounted(async () => {
  const fixtures = [
    { name: 'Landscape · off-centre subject', width: 1800, height: 1200, color: '#346c88' },
    { name: 'Portrait · off-centre subject', width: 1200, height: 1800, color: '#765578' },
    { name: 'Small transparent square', width: 180, height: 180, color: 'transparent' },
  ];
  for (const fixture of fixtures) {
    const canvas = document.createElement('canvas');
    canvas.width = fixture.width;
    canvas.height = fixture.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = fixture.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f6c55f';
    ctx.beginPath();
    ctx.arc(canvas.width * 0.72, canvas.height * 0.38, Math.min(canvas.width, canvas.height) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(14, canvas.width / 24)}px sans-serif`;
    ctx.fillText('ORIGINAL', canvas.width * 0.05, canvas.height * 0.9);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob)
      fixtureIds.value.push(repository.add(fixture.name, blob).id);
  }
  committedId.value = fixtureIds.value[0] || '';
  ready.value = true;
});
</script>

<template>
  <div class="lab">
    <p>This is a local simulation, not Drive. Files and saved state disappear when you leave or refresh this page. Review and approval are required before production integration.</p>
    <label class="persistence-toggle">
      <input v-model="rejectPersistence" type="checkbox">
      Simulate rejected parent persistence (uncheck to retry successfully)
    </label>
    <DevImageFramingHarness
      v-if="ready"
      :key="mountKey"
      :repository="repository"
      :fixtures="fixtureIds"
      :committed-id="committedId"
      :persist="persistParentSelection"
      @save="committedId = $event"
      @remount="mountKey++"
    />
    <p v-else>
      Preparing local fixtures…
    </p>
  </div>
</template>

<style scoped>
.lab > p {
  margin-bottom: 1rem;
}
.persistence-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
</style>
