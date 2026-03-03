# Documentación API – Alarma Comunitaria

Base URL: `http://localhost:3000` (o la URL del servidor desplegado).

---

## Autenticación

Las rutas que requieren autenticación esperan el header:

```
Authorization: Bearer <JWT>
```

El JWT se obtiene con `POST /api/auth/login`. Contiene `userId`, `email`, `name` y expira en 24h.

---

## Endpoints REST

### General

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Mensaje de bienvenida | No |

**Respuesta 200:**  
`{ "message": "API de Alarma Comunitaria funcionando" }`

---

### Usuarios y autenticación

#### GET /api/users

Lista todos los usuarios (sin campo `password`).

**Auth:** No  
**Respuesta 200:** Array de objetos `{ _id, name, email, createdAt, updatedAt }`

---

#### POST /api/auth/register

Registra un nuevo usuario.

**Auth:** No  
**Body (JSON):**

| Campo     | Tipo   | Requerido | Descripción        |
|----------|--------|-----------|--------------------|
| name     | string | Sí        | Nombre (mín. 3 caracteres) |
| email    | string | Sí        | Email único        |
| password | string | Sí        | Mín. 8 caracteres |

**Respuesta 201:**  
`{ "success": true, "user": { "id", "name", "email" } }`  
**Errores:** 400 (email ya registrado), 500

---

#### POST /api/auth/login

Inicia sesión y devuelve JWT.

**Auth:** No  
**Body (JSON):**

| Campo    | Tipo   | Requerido |
|----------|--------|-----------|
| email    | string | Sí        |
| password | string | Sí        |

**Respuesta 200:**  
`{ "success": true, "token": "<JWT>", "user": { "id", "name", "email" } }`  
**Errores:** 401 (credenciales inválidas), 500

---

### Puntos del mapa

#### GET /api/puntos

Lista todos los puntos (robo, secuestro, cámara).

**Auth:** No  
**Respuesta 200:** Array de puntos con `tipo`, `lat`, `lng`, `titulo`, `descripcion`, `fecha`, `usuarioId`, `direccion`, `_id`, timestamps.

---

#### POST /api/puntos

Crea un punto en el mapa.

**Auth:** No  
**Body (JSON):**

| Campo      | Tipo   | Requerido | Descripción                          |
|------------|--------|----------|--------------------------------------|
| tipo       | string | Sí       | `"robo"` \| `"secuestro"` \| `"camara"` |
| lat        | number | Sí       | Latitud                              |
| lng        | number | Sí       | Longitud                             |
| titulo     | string | Sí       | Título del punto                     |
| descripcion| string | Sí       | Descripción                          |
| fecha      | string | No       | Fecha (por defecto hoy)              |
| usuarioId  | string | No       | ObjectId del usuario (o se usa uno por defecto) |
| direccion  | string | No       | Dirección textual                   |

**Respuesta 201:** Objeto del punto creado (con `usuarioId` poblado si aplica).  
**Errores:** 400 (validación), 500

---

#### POST /api/puntos/bulk

Crea múltiples puntos.

**Auth:** No  
**Body (JSON):** Array de objetos con la misma estructura que POST /api/puntos (cada uno debe incluir al menos tipo, lat, lng, titulo, descripcion, usuarioId).

**Respuesta 201:** Array de puntos creados.  
**Errores:** 400 (si body no es array), 500

---

### Notificaciones

#### GET /api/notifications

Lista las notificaciones en memoria del WebSocket (últimas 100), ordenadas por fecha descendente.

**Auth:** Sí (JWT)  
**Respuesta 200:** Array de notificaciones con `id`, `title`, `message`, `timestamp`, `isRead`, `sender`, `metadata`.

---

#### POST /api/notifications

Crea y envía una notificación manual; se hace broadcast por WebSocket.

**Auth:** Sí (JWT)  
**Body (JSON):**

| Campo    | Tipo   | Requerido | Descripción        |
|----------|--------|----------|--------------------|
| title    | string | Sí       | Título             |
| message  | string | Sí       | Mensaje            |
| location | string | Sí       | Ubicación (texto o "lat, lng") |
| alertType| string | No       | Tipo de alerta (default: "general") |
| imageUrl | string | No       | URL de imagen      |

**Respuesta 201:** Objeto de la notificación creada.  
**Errores:** 400 (faltan campos), 401/403 (token), 500

---

#### POST /api/notifications/test

Crea una notificación de prueba y hace broadcast (útil para probar el panel sin JWT).

**Auth:** No  
**Body (JSON):** Opcional. Mismos campos que POST /api/notifications; si se omiten se usan valores por defecto.

**Respuesta 200:**  
`{ "success": true, "notification": { ... }, "connectedClients": number }`

---

#### GET /api/notifications/connected-clients

Devuelve los clientes conectados al WebSocket.

**Auth:** Sí (JWT)  
**Respuesta 200:**  
`{ "connectedClients": [ { "userId", "email", "name", "connectedAt" } ], "count": number }`

---

#### POST /api/notifications/detalle

**Uso:** Llamado por el módulo de cámara (Python) para enviar el detalle de una alerta. La API crea la notificación, la guarda en MongoDB y hace broadcast por WebSocket.

**Auth:** No  
**Body (JSON):**

| Campo            | Tipo   | Requerido | Descripción              |
|------------------|--------|----------|---------------------------|
| nombre_camara    | string | Sí       | Identificador de la cámara |
| ubicacion        | object \| string | Sí | `{ lat, lon }` o string   |
| fecha            | string | Sí       | Fecha del evento          |
| alerta           | string | Sí       | Tipo de alerta            |
| informacion_extra| object | Sí       | Datos extra (p. ej. imageUrl) |

**Respuesta 200:**  
`{ "mensaje": "Detalle recibido correctamente" }`  
**Errores:** 400 (faltan campos), 500

---

#### POST /api/notifications/estado

Recibe el estado de la cámara (p. ej. activa/inactiva); se guarda en MongoDB y se emite por WebSocket.

**Auth:** No  
**Body (JSON):**  
`{ "status": string }`

**Respuesta 200:**  
`{ "status": true, "message": "Solicitud recibida" }`  
**Errores:** 400 (falta status), 500

---

## WebSocket

**URL:** `ws://localhost:3000/ws?token=<JWT>`

### Conexión

- El cliente debe enviar el JWT en el query: `?token=<JWT>`.
- Si el token es inválido o falta, el servidor cierra la conexión con código 1008.
- Al conectar, el servidor envía las últimas 50 notificaciones en un mensaje de tipo `notifications_list`.

### Mensajes que envía el servidor (cliente recibe)

| type                 | Descripción |
|----------------------|-------------|
| `notifications_list` | `{ type, notifications: Array }` – lista inicial al conectar |
| `new_notification`   | `{ type, notification }` – nueva alerta |
| `notification_updated` | `{ type, notificationId, isRead: true }` |
| `all_notifications_read` | Todas marcadas como leídas |
| `evento`             | `{ type, status }` – estado de cámara |
| `actualizar_camara`  | `{ type, detalle }` – detalle de cámara |
| `notification_sent`  | `{ type, notificationId }` – confirmación de envío |

### Mensajes que el cliente puede enviar

| type               | Payload | Descripción |
|--------------------|---------|-------------|
| `send_notification`| `{ notification: { title, message, alertType?, location?, imageUrl? } }` | Crea notificación y broadcast |
| `mark_as_read`     | `{ notificationId: string }` | Marca una como leída |
| `mark_all_read`    | (vacío) | Marca todas como leídas |

Todos los mensajes son JSON. Ejemplo de envío desde el cliente:

```json
{ "type": "mark_as_read", "notificationId": "abc123" }
```

---

## Códigos de error HTTP

| Código | Significado     |
|--------|-----------------|
| 400    | Bad Request – validación o cuerpo incorrecto |
| 401    | No autorizado – token faltante |
| 403    | Token inválido  |
| 500    | Error interno del servidor |

Las respuestas de error suelen ser:  
`{ "message": "..." }` o `{ "error": "..." }`.
