# Mirror Table Interaction Context

This glossary captures the shared language for Drive-tree drag-and-drop into the scene canvas so behavior stays consistent across UI actions.

## Language

**Tree Drop**:
A drag-and-drop operation whose destination is inside the Drive tree hierarchy.
_Avoid_: Internal drop, folder move drop

**Canvas Drop**:
A drag-and-drop operation whose destination is the scene canvas surface.
_Avoid_: External drop, scene drag

**Eligible Asset**:
A Drive asset that is allowed to be added to a scene.
_Avoid_: Valid file, supported file

**Unsupported Drop**:
A drop involving folders or ineligible files that must not create scene content.
_Avoid_: Invalid drag, bad drop

**Drop Position**:
The stage-space coordinates where a canvas drop is applied.
_Avoid_: Screen point, browser point

## Relationships

- A **Tree Drop** can change parentage in the Drive tree
- A **Canvas Drop** never changes Drive tree parentage
- A **Canvas Drop** creates a scene element only when the dragged item is an **Eligible Asset**
- An **Unsupported Drop** produces no scene element
- A **Canvas Drop** resolves a **Drop Position** in stage space

## Example dialogue

> **Dev:** "If I drag an image file from the Drive list onto the scene, is that a **Tree Drop**?"
> **Domain expert:** "No, that is a **Canvas Drop**; it adds content to the scene and does not move Drive folders."

## Flagged ambiguities

- "Drop" was used to mean both tree reparenting and scene insertion - resolved as **Tree Drop** vs **Canvas Drop**.
- "Supported file" and "eligible file" were both used - canonical term is **Eligible Asset**.
