# Quiz Live

Trivia en vivo estilo Kahoot: preguntas de opción múltiple, temporizador,
puntaje por velocidad y ranking en tiempo real. Los jugadores entran desde
el navegador con un código de 6 caracteres — no requiere instalar nada.

## Stack

- **Servidor**: Node.js + Express + Socket.IO (TypeScript). Las salas viven
  en memoria (sin base de datos), pensado para MVP/portafolio.
- **Cliente**: React + Vite (TypeScript), sin dependencias de UI externas.

## Cómo funciona

1. El **host** crea una sala armando preguntas (texto, 2 a 4 opciones,
   opción correcta, tiempo límite por pregunta) → recibe un código de sala.
2. Los **jugadores** entran a la URL del cliente y escriben el código +
   su nombre (o abren un link con el código embebido: `?join=CODIGO`).
3. El host inicia el juego. Cada pregunta se transmite a todos por
   WebSocket con un temporizador sincronizado por el servidor.
4. El puntaje por pregunta es `500 + 500 * (tiempo restante / tiempo total)`
   si la respuesta es correcta, 0 si no. Al cerrarse la pregunta (por
   tiempo o porque todos respondieron) se muestra la respuesta correcta y
   el ranking.
5. Al final se muestra el podio.

## Desarrollo local

```bash
# Terminal 1 — servidor
cd server
npm install
npm run dev        # http://localhost:4000

# Terminal 2 — cliente
cd client
cp .env.example .env   # VITE_SERVER_URL apuntando al servidor
npm install
npm run dev         # http://localhost:5173
```

## Deploy

- **Servidor**: cualquier host de Node.js (Render, Railway, Fly.io). Setear
  `PORT` y `CLIENT_ORIGIN` (URL del cliente desplegado) como variables de
  entorno.
- **Cliente**: cualquier hosting estático (Vercel, Netlify, GitHub Pages).
  Setear `VITE_SERVER_URL` apuntando a la URL pública del servidor antes
  de `npm run build`.

Al ser una app web, los jugadores solo necesitan el link/código — nunca
instalan nada.

## Roadmap

- Generación de preguntas con IA (pendiente: elegir proveedor y agregar
  `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` como secreto de entorno).
- Persistencia de partidas (actualmente todo vive en memoria del servidor
  y se pierde si el host se desconecta o el server se reinicia).
