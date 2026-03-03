# API – Alarma Comunitaria (Node.js)

API REST y servidor WebSocket del sistema Alarma Comunitaria. Gestiona usuarios, puntos en el mapa (robos, secuestros, cámaras) y notificaciones en tiempo real. Recibe además alertas del módulo de cámara (Python) y las difunde a los clientes conectados.

## Stack

- **Runtime:** Node.js
- **Framework:** Express 4.x
- **Base de datos:** MongoDB (Mongoose)
- **Autenticación:** JWT (jsonwebtoken)
- **WebSocket:** `ws`
- **Contraseñas:** bcryptjs

## Estructura

```
api/
├── config/           # Configuración (p. ej. base de datos)
├── controllers/      # Lógica de negocio (users, puntos, notifications)
├── models/           # Esquemas Mongoose (User, Punto, Notification)
├── routes/           # Rutas Express (users, puntos, notifications)
├── simple-server.js  # Entrada: Express + HTTP + WebSocket
├── websocket-server.js # Servidor WebSocket (JWT, broadcast, lista de notificaciones)
├── docs/             # Documentación de la API (API.md)
└── package.json
```

## Configuración

- **Puerto:** por defecto `3000` (configurable en `simple-server.js`).
- **MongoDB:** URI en `simple-server.js`; en producción se recomienda usar `process.env.MONGODB_URI`.
- **JWT:** secreto en `process.env.JWT_SECRET` o valor por defecto en código (cambiar en producción).

## Scripts

```bash
npm start      # node simple-server.js
npm run dev    # nodemon simple-server.js
```

## Endpoints (resumen)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Mensaje de bienvenida | No |
| GET | `/api/users` | Listar usuarios | No |
| POST | `/api/auth/register` | Registro | No |
| POST | `/api/auth/login` | Login (devuelve JWT) | No |
| GET | `/api/puntos` | Listar puntos | No |
| POST | `/api/puntos` | Crear punto | No |
| POST | `/api/puntos/bulk` | Crear varios puntos | No |
| GET | `/api/notifications` | Listar notificaciones | JWT |
| POST | `/api/notifications` | Enviar notificación | JWT |
| POST | `/api/notifications/test` | Notificación de prueba | No |
| GET | `/api/notifications/connected-clients` | Clientes WebSocket conectados | JWT |
| POST | `/api/notifications/detalle` | Recibir detalle desde cámara (Python) | No |
| POST | `/api/notifications/estado` | Recibir estado de cámara | No |

**WebSocket:** `ws://localhost:3000/ws?token=<JWT>`

Documentación completa de parámetros, cuerpos y respuestas: **[docs/API.md](docs/API.md)**.

## WebSocket

- Conexión: `ws://<host>:3000/ws?token=<JWT>`.
- Al conectar se envían las últimas 50 notificaciones (`type: 'notifications_list'`).
- Eventos que recibe el cliente: `new_notification`, `notification_updated`, `all_notifications_read`, `evento`, `actualizar_camara`.
- El cliente puede enviar: `send_notification`, `mark_as_read`, `mark_all_read` (ver API.md).

## Integración con cámara (Python)

El módulo de cámara envía:

- `POST /api/notifications/detalle`: cuerpo con `nombre_camara`, `ubicacion`, `fecha`, `alerta`, `informacion_extra`. La API guarda, crea la notificación y hace broadcast por WebSocket.
- `POST /api/notifications/estado`: cuerpo con `status`; se guarda y se emite como evento a los clientes.

Ver [docs/API.md](docs/API.md) para el formato exacto de los cuerpos.
