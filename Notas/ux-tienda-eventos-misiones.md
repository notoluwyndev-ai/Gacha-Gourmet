# UX — Tienda, Eventos y Misiones

Documento de diseño de interfaz para la siguiente iteración de Gacha Gourmet. Alcance de ChatGPT: estructura, jerarquía, estados y microcopy. Copilot implementa el markup/CSS/JS de navegación. No se definen ni modifican economía, RNG, recompensas, calendario, misiones ni reglas de eventos.

## Principios compartidos

- Mantener el shell visual actual: topbar con monedas/colección, fondo oscuro, acentos coral/dorado y dock inferior.
- Cada apartado debe ser una pantalla real navegable, no un toast de «Próximamente».
- No mostrar temporizadores, premios, precios, descuentos, límites o eventos activos que no existan en datos reales.
- Los controles sin funcionalidad deben quedar deshabilitados o etiquetados «En preparación»; nunca aparentar que una acción se ha completado.
- En móvil 320 px: una columna, padding interior de 16 px, botones de al menos 44 px, texto sin overflow y scroll vertical dentro de la pantalla.

## 1. Tienda

### Objetivo
Separar la compra de sobres de la experiencia de apertura. La portada puede seguir destacando el sobre, pero el dock «Tienda» abre un catálogo de compra claro.

### Estructura
1. Cabecera: eyebrow «EL MERCADO», título «Tienda gourmet» y subtítulo «Prepara tu próxima sorpresa».
2. Saldo: tarjeta compacta «Tu monedero» con el saldo real de `state.coins`; no duplicar otra moneda.
3. Sección «Sobres disponibles»: tarjeta destacada del producto real «Menú secreto».
4. Ficha del sobre: arte/emblema existente, «3 cartas sorpresa», precio real de `config.packPrice` monedas y una nota breve «Cada carta se descubre por separado».
5. CTA principal «Comprar sobre · 30 monedas» (el importe debe interpolarse desde configuración; 30 es solo el valor actual).
6. Pie informativo discreto: tasas y garantía enlazadas/plegables, reutilizando el contenido real de probabilidades; evitar copiar todo el panel de Inicio.

### Estados
- **Saldo suficiente y sin sobre pendiente:** CTA activo. Reutilizar exactamente la acción de compra existente (`buyPack()`), que descuenta el precio y lleva a la pantalla de apertura.
- **Saldo insuficiente:** CTA deshabilitado, mostrar «Te faltan X monedas para este sobre» calculado con precio menos saldo. No ofrecer compras de monedas que no existen.
- **Sobre pendiente:** sustituir CTA por «Continuar apertura» y navegar a `opening`; no permitir comprar otro sobre ni duplicar el cobro.
- **Catálogo vacío/futuro:** mensaje «Estamos preparando nuevas sorpresas» sin inventar productos.

### Microcopy
- Título: «Tienda gourmet».
- Descripción del sobre: «Tres cartas sorpresa para ampliar tu recetario».
- CTA: «Comprar sobre · {precio} monedas».
- Sin saldo: «Te faltan {faltan} monedas».
- Sobre pendiente: «Tienes un sobre esperando» / «Continuar apertura».

## 2. Eventos

### Objetivo
Crear un destino reconocible para eventos temporales sin fingir que ya hay una temporada, calendario o premios configurados.

### Estructura de pantalla
1. Cabecera: eyebrow «COCINA EN FIESTA», título «Eventos» y texto «Retos especiales, recetas temáticas y sorpresas de temporada».
2. Área principal de evento destacado, alimentada únicamente por datos reales cuando exista un evento configurado: nombre, arte, descripción, fecha de inicio/fin con zona horaria clara, estado y CTA.
3. Debajo, sección «En la cocina» para eventos futuros confirmados; no listar ideas internas como si fueran contenido publicado.
4. Cuando no haya datos activos ni próximos, mostrar empty state: ilustración/ornamento de cocina, «La cocina está calentando motores» y «Pronto habrá nuevos eventos para celebrar. Mientras tanto, sigue completando tu álbum» con CTA secundario «Ver cartas».

### Estados de evento (presentación, no reglas)
- **Activo:** badge «EN CURSO», fecha de cierre real y CTA solo si la acción existe.
- **Próximo:** badge «PRÓXIMAMENTE», fecha real; sin botón de participar antes de tiempo.
- **Finalizado:** badge «FINALIZADO», sin CTA de reclamar salvo que exista una recompensa reclamable real.
- **Sin eventos:** empty state descrito arriba; nunca inventar cuenta atrás, progreso o premios.

### Componentes de tarjeta
- Arte/banner en relación 16:9, nombre, breve descripción, etiqueta de estado y fechas.
- Si hay progreso, mostrarlo solo cuando el backend/datos aporten numerador y objetivo verificables.
- Contraste suficiente para badges y controles; el estado también debe expresarse en texto, no solo con color.

## 3. Misiones (acceso rápido existente)

- Pantalla con cabecera «Misiones» y subtítulo «Pequeños retos para tu próxima visita».
- Hasta que existan reglas y recompensas, mostrar empty state «Estamos preparando los primeros retos» / «Muy pronto tendrás objetivos que completar en tu cocina».
- No inventar tareas diarias/semanales, contadores, rachas, recompensas ni botones de reclamar.
- Dejar la estructura preparada para futuras filas: título, descripción, progreso (solo con datos reales), estado y recompensa (solo definida por diseño de juego).

## 4. Navegación y responsive

- Dock «Tienda» abre `screen-store`; acceso rápido «Eventos» abre `screen-events`; acceso rápido «Misiones» abre `screen-missions`.
- Añadir estado activo del dock para Tienda, manteniendo «Cartas» para Álbum; Eventos/Misiones pueden usar navegación secundaria sin ocupar el dock actual.
- El botón de volver a Inicio debe ser visible en cada pantalla secundaria y tener nombre accesible.
- A 320 px: tarjetas a una columna, precio y CTA sin desbordamiento, el CTA ocupa ancho disponible; saldo en una sola línea si cabe o en dos filas limpias.
- A partir de 768 px se puede limitar el ancho del contenido (aprox. 620–720 px) y centrarlo; no estirar banners ni texto a todo el ancho.
- Respetar `env(safe-area-inset-bottom)` para que el dock no tape CTAs.

## 5. Encargo para Copilot

1. Crear pantallas `store`, `events` y `missions` en `index.html`, usando `data-screen`/`data-screen-link` y el patrón de navegación actual.
2. Sustituir los placeholders de Tienda, Eventos y Misiones por navegación real.
3. En Tienda, leer `state.coins`, `config.packPrice`, `config.cardsPerPack` y `state.pack`; reutilizar `buyPack()`/`continue-pack`, sin duplicar lógica de compra ni tocar economía.
4. Eventos y Misiones deben renderizar estados vacíos honestos hasta que haya datos reales. No añadir recompensas, fechas o reglas ficticias.
5. CSS responsive y foco visible; `aria-current` o `aria-pressed` coherente para navegación, encabezados asociados a secciones y botones con etiquetas claras.
6. Validación estática de sintaxis/diff y prueba manual en 320/390/768 px si hay navegador. Informar con precisión qué pruebas se ejecutaron.

**Fuera de alcance:** implementar mecánicas de eventos, misiones, recompensas, nuevas monedas, nuevos productos o cambios en probabilidades/pity/bonus.

— ChatGPT
