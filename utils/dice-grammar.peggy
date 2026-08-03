// TTRPG dice notation grammar. Compiled to utils/dice-grammar.gen.js via peggy
// (see package.json "dice:grammar" script, wired into predev/prebuild/pretest).
// Do not edit the generated file directly - edit this grammar and regenerate.
{
  function makeBinary(left, rest) {
    return rest.reduce((acc, [operator, right]) => ({
      type: 'BINARY_OP',
      operator,
      left: acc,
      right,
    }), left);
  }
}

Start
  = _ e:Expression _ { return e; }

// ---- Full expression grammar (system intent shorthands recognized) ----

Expression
  = Additive

Additive
  = left:Multiplicative rest:(_ op:("+" / "-") _ right:Multiplicative { return [op, right]; })*
    { return makeBinary(left, rest); }

Multiplicative
  = left:Primary rest:(_ op:("*" / "/" / "%") _ right:Primary { return [op, right]; })*
    { return makeBinary(left, rest); }

Primary
  = NimbleIntentTerm
  / AdvantageDisadvantageTerm
  / EscapeTerm
  / PlainPrimary

// ---- Plain (system-intent-free) grammar, used standalone and after std:/raw: ----

PlainAdditive
  = left:PlainMultiplicative rest:(_ op:("+" / "-") _ right:PlainMultiplicative { return [op, right]; })*
    { return makeBinary(left, rest); }

PlainMultiplicative
  = left:PlainPrimary rest:(_ op:("*" / "/" / "%") _ right:PlainPrimary { return [op, right]; })*
    { return makeBinary(left, rest); }

PlainPrimary
  = GroupedPool
  / DicePool
  / Number
  / "(" _ e:Expression _ ")" { return e; }

EscapeTerm
  = ("std:" / "raw:") _ e:PlainAdditive { return e; }

Number
  = n:Integer { return { type: 'LITERAL', value: n }; }

// ---- System intent shorthands ----

NimbleIntentTerm
  = "nd" _ base:DiceCountSides advDis:(m:("a" / "d") !([lh]) extra:Integer? { return { mode: m, extra: extra ?? 1 }; })? mod:(_ "+" _ n:Integer { return n; })?
    {
      return {
        type: 'NIMBLE_DAMAGE_INTENT',
        baseDice: base,
        advantage: advDis?.mode === 'a',
        disadvantage: advDis?.mode === 'd',
        extraDice: advDis?.extra ?? 1,
        flatModifier: mod ?? undefined,
      };
    }

AdvantageDisadvantageTerm
  = base:DiceCountSides mode:("a" / "d") !([lh]) extra:Integer?
    {
      return {
        type: 'ADVANTAGE_DISADVANTAGE_INTENT',
        baseDice: base,
        mode: mode === 'a' ? 'ADVANTAGE' : 'DISADVANTAGE',
        extraDice: extra ?? 1,
      };
    }

DiceCountSides
  = count:Integer "d" sides:Integer { return { count, sides }; }

// ---- Primitive dice pools & modifiers ----

DicePool
  = base:DiceCountSides modifiers:DiceModifier*
    { return { type: 'DICE_POOL', count: base.count, sides: base.sides, modifiers }; }

GroupedPool
  = "{" _ first:DicePool rest:(_ "," _ p:DicePool { return p; })* _ "}"
    { return { type: 'GROUPED_POOL', pools: [first, ...rest] }; }

DiceModifier
  = KeepDropModifier
  / ExplodeModifier
  / RerollModifier
  / ValueBumpModifier

KeepDropModifier
  = "kh" n:Integer { return { type: 'KEEP', target: 'HIGHEST', count: n }; }
  / "kl" n:Integer { return { type: 'KEEP', target: 'LOWEST', count: n }; }
  / "dh" n:Integer { return { type: 'DROP', target: 'HIGHEST', count: n }; }
  / "dl" n:Integer { return { type: 'DROP', target: 'LOWEST', count: n }; }
  / "k" n:Integer { return { type: 'KEEP', target: 'HIGHEST', count: n }; }

// `[N]` is the only positional-target spelling (1-based, converted to 0-based here) -
// kept distinct from a bare `N` face-value condition to avoid the `!1` ambiguity.
PositionalTarget
  = "[" n:Integer "]" { return { targetDieIndex: n - 1 }; }

ExplodeModifier
  = "!" rest:(
        "!" { return { compounding: true, condition: 'MAX' }; }
      / "p" { return { compounding: false, condition: 'MAX', targetDieIndex: 0 }; }
      / pos:PositionalTarget { return { compounding: false, condition: 'MAX', ...pos }; }
      / ">=" n:Integer { return { compounding: false, condition: 'GREATER_EQUAL', threshold: n }; }
      / "<=" n:Integer { return { compounding: false, condition: 'LESS_EQUAL', threshold: n }; }
      / n:Integer { return { compounding: false, condition: 'EXACT', threshold: n }; }
      / "" { return { compounding: false, condition: 'MAX' }; }
    )
    { return { type: 'EXPLODE', ...rest }; }

RerollModifier
  = "ro" cond:RerollCondition pos:PositionalTarget? { return { type: 'REROLL', once: true, ...cond, ...pos }; }
  / "r" cond:RerollCondition pos:PositionalTarget? { return { type: 'REROLL', once: false, ...cond, ...pos }; }

RerollCondition
  = "<=" n:Integer { return { condition: 'LESS_EQUAL', threshold: n }; }
  / n:Integer { return { condition: 'EXACT', threshold: n }; }

ValueBumpModifier
  = "+^" n:Integer { return { type: 'VALUE_BUMP', amount: n, clampAtMax: true }; }
  / "b" n:Integer { return { type: 'VALUE_BUMP', amount: n, clampAtMax: true }; }

// ---- Lexical ----

Integer
  = digits:[0-9]+ { return parseInt(digits.join(''), 10); }

_ "whitespace"
  = [ \t\n\r]*
