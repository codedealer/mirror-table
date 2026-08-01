# Mirror Table Interaction Context

This glossary captures the shared language for Drive-tree drag-and-drop into the scene canvas so behavior stays consistent across UI actions.

## Language

**Tree Drop**:
A drag-and-drop operation whose destination is inside the Drive tree hierarchy.
_Avoid_: Internal drop, folder move drop

**Canvas Drop**:
A drag-and-drop operation whose destination is the scene canvas surface.
_Avoid_: External drop, scene drag

**Canvas Drop Source**:
The origin of a Canvas Drop payload.
Allowed values: DriveTree Source, File Source.
_Avoid_: External drop type, drop variant

**Eligible Asset**:
A Drive asset that is allowed to be added to a scene.
_Avoid_: Valid file, supported file

**Unsupported Drop**:
A drop involving folders or ineligible files that must not create scene content.
_Avoid_: Invalid drag, bad drop

**Ambiguous Drop**:
A drop that contains actionable payload from both Canvas Drop Sources at once.
_Avoid_: Mixed source drop, conflicting drop

**Drop Position**:
The stage-space coordinates where a canvas drop is applied.
_Avoid_: Screen point, browser point

## Relationships

- A **Tree Drop** can change parentage in the Drive tree
- A **Canvas Drop** never changes Drive tree parentage
- A **Canvas Drop** creates a scene element only when the dragged item is an **Eligible Asset**
- An **Unsupported Drop** produces no scene element
- A **Canvas Drop** resolves a **Drop Position** in stage space
- A **Canvas Drop** always has a **Canvas Drop Source**
- An **Ambiguous Drop** is rejected and does not create scene content

## Example dialogue

> **Dev:** "If I drag an image file from the Drive list onto the scene, is that a **Tree Drop**?"
> **Domain expert:** "No, that is a **Canvas Drop**; it adds content to the scene and does not move Drive folders."

## Flagged ambiguities

- "Drop" was used to mean both tree reparenting and scene insertion - resolved as **Tree Drop** vs **Canvas Drop**.
- "Supported file" and "eligible file" were both used - canonical term is **Eligible Asset**.

---

# Dice Roll Language

This glossary captures the shared language for the TTRPG dice evaluation engine (see `.github/20260730_dice_roller/PLAN.md`) so terminology stays consistent between the parser, lowering pass, and evaluator.

## Language

**Roll Expression**:
A user-authored notation string describing a dice roll request.
_Avoid_: Formula, dice string, notation

**System Profile**:
A pluggable, explicitly-selected rewrite pass that expands one game system's shorthand into standard primitive rolls.
_Avoid_: Ruleset, game mode

**System Intent**:
A parsed node representing a game-system shorthand (e.g. Nimble damage, D&D advantage) before it is expanded by a System Profile.
_Avoid_: Macro node, shorthand node

**Primary Die**:
The first die in a pool's result order once Keep/Drop filtering has settled; the only die targeted by positional explosion.
_Avoid_: Lead die, main die

**Dice Pool**:
One uniform group of same-sided dice plus its own modifiers.
_Avoid_: Dice set, roll group

**Grouped Pool**:
Two or more Dice Pools combined into a single roll, each keeping its own modifiers.
_Avoid_: Compound roll, dice bundle

**Explosion**:
Rolling and adding an extra die when a die meets its trigger condition.
_Avoid_: Reroll bonus, bonus die

**Value Bump**:
A flat adjustment to a die's rolled face value, capped at the die's max face.
_Avoid_: Face boost, pip bump

**Escape Hatch**:
The `std:`/`raw:` expression prefix that forces standard primitive parsing regardless of any active System Profile.
_Avoid_: Override, bypass mode

## Relationships

- A **Roll Expression** is parsed into primitive nodes and/or **System Intent** nodes, unconditionally - the parser never depends on which profile is active
- A **System Intent** is expanded into a **Dice Pool** or **Grouped Pool** by exactly one **System Profile**
- A **Dice Pool**'s **Primary Die** is only meaningful after Keep/Drop filtering settles
- A **Grouped Pool** contains one or more **Dice Pool**s, each independently modified
- An **Escape Hatch** suppresses **System Intent** parsing for that expression, regardless of the active **System Profile**

## Example dialogue

> **Dev:** "If no System Profile is active and the user types `nd 3d6`, is `nd` still a System Intent?"
> **Domain expert:** "Yes - the parser always recognizes it as a System Intent node. It just won't be expanded, because the Nimble System Profile isn't active; evaluating it directly throws, naming the profile it needs."

## Flagged ambiguities

- "Macro" and "shorthand" were both used for the same idea - canonical term is **System Intent**.
- Whether illegal-per-game-system rolls (e.g. `2d20a`) should be rejected was raised and explicitly resolved as: not rejected - the engine has no legality concept at all (see ADR 0004).

