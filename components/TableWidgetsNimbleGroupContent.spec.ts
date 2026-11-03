import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(new URL('./TableWidgetsNimbleGroupContent.vue', import.meta.url), 'utf8');

describe('nimble quantity badge presentation', () => {
  it('uses the subtype-aware NPC quantity badge value', () => {
    expect(componentSource).toContain('nimbleNpcQuantityBadge(actor.npc) !== undefined');
    expect(componentSource).toContain(':text="nimbleNpcQuantityBadge(actor.npc) ?? \'\'"');
  });
});

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

  it('shares NPC name colors with viewers and places subtype markers on avatars', () => {
    expect(componentSource).toMatch(/:class="`nimble-row__npc-name--\$\{actor\.npc\.subtype\}`"/);
    expect(componentSource).not.toMatch(/props\.isOwner \? `nimble-row__npc-name--\$\{actor\.npc\.subtype\}`/);
    expect(componentSource).toContain(':subtype="isWidgetNimbleGroupActorNpc(actor) ? actor.npc.subtype : undefined"');

    const labSource = readFileSync(new URL('./DevNimbleGroupLab.vue', import.meta.url), 'utf8');
    expect(labSource).toContain(String.raw`npc.npc.subtype = 'legendary'`);
    expect(labSource).toContain(String.raw`hidden.npc.subtype = 'minion'`);
    expect(labSource).toContain(String.raw`flunky.npc.subtype = 'flunky'`);
    expect(labSource).toContain(String.raw`regular.npc.subtype = 'regular'`);
    expect(labSource).toContain(String.raw`warden: '/logo.png'`);
    expect(labSource).toContain(':avatar-srcs="avatarSrcs"');
    const localAvatarPath = new URL('../public/logo.png', import.meta.url);
    expect(readFileSync(localAvatarPath).byteLength).toBeGreaterThan(0);
  });

  it('hides NPC stats from viewers and uses semantic stat colors', () => {
    expect(componentSource).toContain('<div v-if="props.isOwner" class="ghost-container">');
    expect(componentSource).toContain('<span class="text-secondary">Wil</span> <span class="text-primary">{{ actor.npc.stats.wil }}</span>');
    expect(componentSource).toContain('<span class="text-secondary">Wil</span> <span class="text-primary">{{ actor.player.stats.wil }}</span>');
    expect(componentSource).not.toContain('<strong>Wil</strong>');
    expect(componentSource).not.toContain('<strong>Str</strong>');
    expect(componentSource).not.toContain('<strong>Dex</strong>');
    expect(componentSource).not.toContain('<strong>Int</strong>');
  });
});
