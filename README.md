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
- Los duplicados se conservan como cantidad en el inventario; no se convierten
	en monedas.
- Monedas, inventario y un sobre pendiente se guardan en el navegador.