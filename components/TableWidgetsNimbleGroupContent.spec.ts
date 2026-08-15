import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(new URL('./TableWidgetsNimbleGroupContent.vue', import.meta.url), 'utf8');

describe('nimble hitpoint popover wiring', () => {
  it('uses the shared update path for player and NPC hitpoint popovers', () => {
    expect(componentSource).toContain(String.raw`@keydown.enter.prevent.stop="updateHitPoints(actor, 0)"`);
    expect(componentSource).toContain(String.raw`@keydown.enter.prevent.stop="updateHitPoints(actor, index)"`);
    expect(componentSource).toContain(String.raw`emit('updateHitPoints', actor, index, hitPoints)`);
  });

  it('converts an empty damage field to zero before applying damage', () => {
    expect(componentSource).toContain(String.raw`const damage = Number(draft?.damage || 0);`);
  });

  it('preserves the player wounds update path in both parent consumers', () => {
    const tableGroupSource = readFileSync(new URL('./TableWidgetsNimbleGroup.vue', import.meta.url), 'utf8');
    const devLabSource = readFileSync(new URL('./DevNimbleGroupLab.vue', import.meta.url), 'utf8');

    expect(tableGroupSource).toContain('@update-player-wounds="updatePlayerWounds"');
    expect(tableGroupSource).toContain('wounds: { current, max }');
    expect(devLabSource).toContain('@update-player-wounds="updatePlayerWounds"');
    expect(devLabSource).toContain('actor.player.wounds = { current, max };');
  });
});

describe('nimble privacy and stat presentation', () => {
  it('hides passed controls when the shared controls guard is false', () => {
    const controlsSource = readFileSync(new URL('./TableWidgetsControls.vue', import.meta.url), 'utf8');

    expect(controlsSource).toContain('<div v-if="showControls" class="ghost-container">');
    expect(controlsSource).toContain('<slot />');
    expect(controlsSource).not.toContain('<slot v-if="showControls" />');
  });

  it('hides NPC stats from viewers and uses semantic stat colors', () => {
    expect(componentSource).toContain('<div v-if="props.isOwner && isWidgetNimbleGroupActorNpc(actor)" class="nimble-row__player-stats">');
    expect(componentSource).toContain('<span class="text-secondary">Wil</span> <span class="text-primary">{{ actor.npc.stats.wil }}</span>');
    expect(componentSource).toContain('<span class="text-secondary">Wil</span> <span class="text-primary">{{ actor.player.stats.wil }}</span>');
    expect(componentSource).not.toContain('<strong>Wil</strong>');
    expect(componentSource).not.toContain('<strong>Str</strong>');
    expect(componentSource).not.toContain('<strong>Dex</strong>');
    expect(componentSource).not.toContain('<strong>Int</strong>');
  });
});
