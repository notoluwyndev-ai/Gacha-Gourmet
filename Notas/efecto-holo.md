# Efecto holográfico — cartas Ultra rara

Especificación de diseño (Claude, líder de diseño) para dar a las Ultra raras
un acabado distinto a simple vista, sin depender del arte final.

## Objetivo

Que una Ultra rara se note "especial" al instante, incluso con el emoji
placeholder, reforzando el momento de recompensa (coherente con el objetivo
de diseño "dopamínico" del protocolo del equipo).

## Implementación actual (CSS puro, sin tocar `app.js`)

- Capa `::after` sobre `.food-card.rarity-ultra:not(.is-locked)`: un degradado
  diagonal repetido (rosa/cian/amarillo/menta) con `mix-blend-mode:
  color-dodge` y animación de desplazamiento de fondo (`holo-shift`,
  4.5 s, ease-in-out, loop).
- `z-index: 3` para quedar por encima del arte y del sello de rareza
  decorativo (`::before`, `z-index: 1`).
- Excluida de cartas bloqueadas (`is-locked`) — una carta "sin descubrir" no
  debe insinuar su rareza real.
- Respeta `prefers-reduced-motion: reduce`: la regla global ya existente al
  final de `styles.css` fuerza `animation-duration: 0.01ms` para todo, así
  que el holo se vuelve estático (sin parpadeo) en ese caso sin necesidad de
  código adicional.
- No requiere imagen; funciona igual de bien sobre el emoji `food-mark` que
  sobre una `img` real en `card.image`, porque la capa va por encima de todo
  el `.food-art`.

## Dónde se ve

Cualquier `.food-card` con `rarity-ultra` y no bloqueada: álbum, revelado de
sobre (`.reveal-card`) y resumen de apertura completada
(`.pack-complete .food-card`) — es la misma clase en los tres sitios, así
que el efecto aparece gratis en los tres sin tocar `app.js`.

## Pendiente / ideas futuras (no implementadas aún)

- Versión con seguimiento del puntero (`pointer-events`, `mousemove`) para un
  efecto de "tarjeta física inclinada" más premium — requeriría JS y tocar
  `app.js` o un script aparte; de momento se descarta para no complicar el
  MVP y porque en móvil no hay puntero.
- Variante de intensidad distinta para el `.pending-pack`/sello del sobre
  antes de abrir (actualmente el sello no indica rareza, a propósito, para
  no filtrar el resultado antes del revelado — no tocar esto).
- Si en el futuro se añade una rareza "Legendaria" (ver `Notas/reglas.md`),
  este mismo patrón de `::after` + `mix-blend-mode` puede reutilizarse con
  otra paleta de color para diferenciarla de Ultra rara.
