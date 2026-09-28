# Quiz Live

Trivia en vivo estilo Kahoot: preguntas de opción múltiple, temporizador,
puntaje por velocidad y ranking en tiempo real. Los jugadores entran desde
el navegador con un código de 6 caracteres — no requiere instalar nada.

## Stack

- **Servidor**: Node.js + Express + Socket.IO (TypeScript). Las salas viven
  en memoria (sin base de datos), pensado para MVP/portafolio.
- **Cliente**: React + Vite (TypeScript), sin dependencias de UI externas.

## Cómo funciona

1. El **host** crea una sala armando preguntas a mano, o subiendo un **PDF**
   para que la IA (Claude) genere un borrador de preguntas a partir del
   contenido — en ambos casos se revisan/editan antes de crear la sala
   (texto, 2 a 4 opciones, opción correcta, tiempo límite por pregunta).
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
export ANTHROPIC_API_KEY=sk-ant-...   # necesaria solo para generar preguntas desde PDF
npm run dev        # http://localhost:4000

# Terminal 2 — cliente
cd client
cp .env.example .env   # VITE_SERVER_URL apuntando al servidor
npm install
npm run dev         # http://localhost:5173
```

## Generación de preguntas desde PDF

En la pantalla de creación de sala (host) hay una sección "Generar desde
PDF": subes un PDF, eliges cuántas preguntas quieres, y el servidor:

1. Extrae el texto del PDF (`pdf-parse`).
2. Se lo manda a Claude (`claude-haiku-4-5`) pidiendo preguntas de opción
   múltiple basadas solo en ese contenido, en JSON.
3. Devuelve el borrador al formulario, donde puedes editar texto, opciones,
   la respuesta correcta o el tiempo de cada pregunta antes de crear la
   sala — la IA nunca crea la sala directamente.

Requiere la variable de entorno `ANTHROPIC_API_KEY` en el servidor
(consíguela en [console.anthropic.com](https://console.anthropic.com),
sección API Keys). Sin esa variable, todo lo demás de la app funciona
igual — solo no vas a poder generar preguntas desde PDF.

## Deploy

- **Servidor**: cualquier host de Node.js (Render, Railway, Fly.io). Setear
  `PORT`, `CLIENT_ORIGIN` (URL del cliente desplegado) y
  `ANTHROPIC_API_KEY` como variables de entorno.
- **Cliente**: cualquier hosting estático (Vercel, Netlify, GitHub Pages).
  Setear `VITE_SERVER_URL` apuntando a la URL pública del servidor antes
  de `npm run build`.

Al ser una app web, los jugadores solo necesitan el link/código — nunca
instalan nada.

## Roadmap

- Persistencia de partidas (actualmente todo vive en memoria del servidor
  y se pierde si el host se desconecta o el server se reinicia).
