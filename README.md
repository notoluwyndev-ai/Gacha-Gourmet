# Gacha Gourmet

Prototipo jugable de colección y apertura de sobres. Abre `index.html` en un
navegador moderno; no requiere instalación ni servidor local. La partida se
guarda en el almacenamiento local del navegador.

## Añadir cartas

1. Copia la imagen en `assets/cards/`.
2. Añade un objeto al arreglo `cards` de `data/cards.js`, con un `id` único,
	 `name`, `rarity`, `category`, `symbol` y `flavor`.
3. Para mostrar la imagen, añade `image: "assets/cards/nombre-del-archivo.png"`.
	 Si no hay imagen, se muestra el símbolo como recurso provisional.

Rarezas válidas: `comun`, `rara` y `ultra`. Categorías: `Horno`, `Nevera`,
`Postre`, `Fast Food`, `Huerta` y `Despensa`. Cada rareza con probabilidad debe
tener al menos una carta en el catálogo.

## Reglas iniciales

- 120 monedas al empezar; cada sobre cuesta 30.
- 3 cartas por sobre; cada posición se sortea de forma independiente.
- Probabilidades por carta: Común 75 %, Rara 20 % y Ultra rara 5 %.
- **Sistema de garantía (pity):** si pasan 19 cartas seguidas sin salir Ultra
	rara, la carta número 20 es Ultra rara garantizada y el contador se reinicia.
	No cambia las probabilidades de cada tirada (siguen siendo 75/20/5); solo
	pone un techo a la mala suerte. Se configura en `data/cards.js` con
	`config.pity: { rarity, threshold }`; para quitarlo basta con borrar esa
	clave. El contador se guarda en el navegador junto con la partida.
- Los duplicados se conservan como cantidad en el inventario; no se convierten
	en monedas.
- Monedas, inventario, un sobre pendiente y el contador de garantía se guardan
	en el navegador.