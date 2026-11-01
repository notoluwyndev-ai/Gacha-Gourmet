# Reglas del gacha — Gacha Gourmet

Referencia de mecánicas y probabilidades. Los valores reales viven en
`data/cards.js` (`config`); este documento explica el *porqué*.

## Economía

- Monedas iniciales: 120.
- Precio del sobre: 30 monedas.
- Cartas por sobre: 3, cada una sorteada de forma independiente (no hay
  combinaciones fijas ni slots por rareza).

## Rarezas y probabilidades

| Rareza     | Probabilidad por carta |
|------------|-------------------------|
| Común      | 75 % |
| Rara       | 20 % |
| Ultra rara | 5 %  |

Las probabilidades deben sumar siempre 100 %; `validateCatalog()` en `app.js`
lo comprueba al cargar el juego y bloquea la partida con un aviso si no
cuadra. Cada rareza con probabilidad > 0 necesita al menos una carta en el
catálogo, o también se bloquea.

## Sistema de garantía (pity)

- Configurado en `config.pity = { rarity: "ultra", threshold: 20 }`.
- Cuenta cartas individuales (no sobres) desde la última Ultra rara obtenida.
- Si el contador llega a `threshold - 1` (19 cartas sin Ultra rara), la
  siguiente tirada se fuerza a Ultra rara y el contador vuelve a 0.
- No altera el roll base: las probabilidades 75/20/5 se mantienen en cada
  tirada; el pity es una red de seguridad aparte, no una curva de
  probabilidad creciente.
- Validado por simulación (1 000 000 de tiradas): ninguna racha sin Ultra
  rara superó las 19 cartas, como se esperaba del umbral de 20.
- Efecto secundario esperado y aceptado: la tasa *observada* de Ultra rara a
  largo plazo sube un poco por encima del 5 % nominal (en la simulación,
  ≈7,8 %), porque el pity añade Ultra raras extra en las rachas malas sin
  quitarlas en las buenas. Es el comportamiento estándar de un pity system y
  se documenta aquí para que nadie lo confunda con un bug de probabilidades.
- Se puede desactivar quitando `config.pity` de `data/cards.js`, o ajustar el
  umbral cambiando `threshold`.

## Duplicados

- No se destruyen ni se convierten en monedas (de momento). Se acumulan como
  cantidad (`×N`) en el inventario y cuentan para el total de cartas, pero no
  para el porcentaje de álbum completado (que mide cartas únicas).
- Pendiente de decisión de equipo: convertir duplicados en monedas (ver
  propuesta de Claude en `Chat/Chat.md`, 2026-11-01).

## Añadir una cuarta rareza (futuro)

El sistema ya es extensible sin tocar `app.js`: basta con añadir la rareza
nueva a `config.odds` (ajustando las demás para que sigan sumando 100 %) y
al menos una carta con esa rareza en `cards`. Si se quiere que el pity
proteja otra rareza, basta con cambiar `config.pity.rarity`.
