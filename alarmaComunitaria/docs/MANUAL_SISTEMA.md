# Manual del sistema – Alarma Comunitaria

Este documento describe el **funcionamiento general** del sistema, los flujos de datos, cómo poner en marcha cada parte y las configuraciones recomendadas.

---

## 1. Visión general

Alarma Comunitaria consta de:

1. **Frontend (Angular):** interfaz web para usuarios (login, mapa, notificaciones, alertas).
2. **API (Node.js):** centro del sistema; gestiona usuarios, puntos en el mapa y notificaciones; expone REST y WebSocket.
3. **Módulo Cámara (Python):** videovigilancia con detección IA; en caso de evento envía la alerta a la API.
4. **Módulo Sonido (Python):** servidor que activa la alarma sonora en dispositivos de la red.

El flujo principal es: **Usuario/Frontend** y **Cámara** interactúan con la **API**; la API persiste datos en **MongoDB** y difunde notificaciones en tiempo real por **WebSocket** a los clientes conectados.

---

## 2. Flujo de funcionamiento

### 2.1 Autenticación

1. El usuario abre la app (frontend) y es redirigido a `/login` si no hay token.
2. Desde el frontend se llama a `POST /api/auth/login` (email, contraseña) o `POST /api/auth/register` (nombre, email, contraseña).
3. La API valida, en login compara contraseña con bcrypt y devuelve un **JWT**.
4. El frontend guarda el token (p. ej. en memoria o almacenamiento) y lo envía en cabecera `Authorization: Bearer <token>` en las peticiones que requieren autenticación.
5. Para el WebSocket, el cliente se conecta a `ws://<host>:3000/ws?token=<JWT>`; la API valida el JWT y mantiene la conexión.

### 2.2 Mapa de puntos

1. La API expone `GET /api/puntos` para listar todos los puntos (robo, secuestro, cámara).
2. El frontend obtiene los puntos (al cargar el dashboard) y los muestra en el mapa con Leaflet (clusters de marcadores).
3. Crear punto: `POST /api/puntos` con tipo, lat, lng, titulo, descripcion, fecha, usuarioId, direccion. Opcionalmente `POST /api/puntos/bulk` para varios.
4. Los puntos se guardan en MongoDB (modelo Punto) y se muestran en el mapa sin necesidad de recargar si la app vuelve a pedir la lista.

### 2.3 Notificaciones en tiempo real

1. El usuario autenticado abre el dashboard; el frontend se conecta al WebSocket con el JWT.
2. Al conectar, la API envía las últimas 50 notificaciones (`type: 'notifications_list'`).
3. Cuando ocurre una alerta:
   - **Manual:** el usuario envía una notificación desde el frontend (`POST /api/notifications` con JWT) con título, mensaje, tipo, ubicación, etc. La API la guarda en memoria (lista de notificaciones), la persiste en MongoDB (modelo Notification si aplica) y hace **broadcast** por WebSocket (`type: 'new_notification'`).
   - **Automática (cámara):** el servidor Python de cámara hace `POST /api/notifications/detalle` con nombre_camara, ubicación, fecha, alerta, informacion_extra. La API crea la notificación, la añade a la lista y hace broadcast por WebSocket. Los clientes reciben `new_notification` y opcionalmente `actualizar_camara`.
4. El frontend actualiza el panel de notificaciones y puede mostrar un popup de alerta.
5. Marcar como leída: el cliente envía por WebSocket `mark_as_read` o `mark_all_read`; la API actualiza y hace broadcast de la actualización.

### 2.4 Cámara (opcional)

1. El servidor de cámara (Python) captura video, ejecuta detección YOLOv8 y, si detecta evento de riesgo, graba el video.
2. Opcionalmente sube el video a Backblaze B2 y genera una descripción con IA (Gemini).
3. Envía a la API:
   - `POST /api/notifications/detalle` con el detalle del evento (nombre_camara, ubicación, fecha, alerta, informacion_extra).
   - Opcionalmente `POST /api/notifications/estado` con el estado de la cámara.
4. La API guarda, construye la notificación y la difunde por WebSocket; los clientes ven la alerta en el panel y en el mapa si se usa la ubicación.
5. El frontend puede mostrar el stream de la cámara (URL configurable) para vista en vivo.

### 2.5 Sonido (opcional)

1. El módulo sonido es un servidor Flask independiente que expone `GET/POST /activar_alarma`.
2. Al recibir la petición, hace HTTP GET a cada URL de la lista de dispositivos (p. ej. `http://<IP>:5005/sonar`).
3. La integración con el resto del sistema es externa: un botón en el frontend o una llamada desde la API cuando se dispare una alerta puede invocar `http://<host-sonido>:5020/activar_alarma`.

---

## 3. Puesta en marcha paso a paso

### 3.1 Requisitos previos

- **Node.js** 18 o superior (para API y frontend).
- **MongoDB** (local o Atlas); tener la URI de conexión.
- **Python** 3.10+ (solo si se usan cámara o sonido).
- **npm** (o yarn).

### 3.2 API (obligatoria para el frontend)

1. Ir a `alarmaComunitaria/backend/api`.
2. Ejecutar `npm install`.
3. Configurar la URI de MongoDB en `simple-server.js` (o con variable de entorno `MONGODB_URI`).
4. Opcional: configurar `JWT_SECRET` con variable de entorno.
5. Ejecutar `npm start`. El servidor queda en `http://localhost:3000` y WebSocket en `ws://localhost:3000/ws`.

### 3.3 Frontend

1. Ir a `alarmaComunitaria/frontend`.
2. Ejecutar `npm install`.
3. Ejecutar `ng serve`.
4. Abrir `http://localhost:4200`. Comprobar que la URL de la API en los servicios apunte a `http://localhost:3000` (o al host donde corre la API).

### 3.4 Cámara (opcional)

1. Ver `backend/camara/README.md`.
2. Instalar dependencias: desde `backend`, `pip install -r requirements.txt`.
3. Configurar modelos YOLOv8 y credenciales B2 (y URL de la API si no es localhost).
4. Iniciar la API antes que la cámara. Luego ejecutar el servidor de cámara (p. ej. `python servidorcamara.py` desde `backend/camara`).

### 3.5 Sonido (opcional)

1. Ver `backend/sonido/README.md`.
2. Instalar Flask, flask-cors, requests.
3. Configurar en `servidorsonido.py` la lista de URLs de dispositivos.
4. Ejecutar el script; por defecto escucha en el puerto 5020.

---

## 4. Configuración recomendada

- **Producción API:** usar variables de entorno para `MONGODB_URI`, `JWT_SECRET` y `PORT`; no dejar credenciales en el código.
- **CORS:** en la API ya está habilitado; en producción restringir orígenes si es necesario.
- **Cámara:** no subir credenciales de B2 o de Gemini al repositorio; usar variables de entorno o secretos.
- **WebSocket:** en producción usar WSS (WebSocket seguro) detrás de un proxy (p. ej. Nginx) con TLS.

---

## 5. Resumen de puertos por defecto

| Servicio      | Puerto | Descripción                    |
|---------------|--------|--------------------------------|
| API (Node)    | 3000   | REST + WebSocket               |
| Frontend      | 4200   | Angular (ng serve)             |
| Cámara (Flask)| 5001–5010 | Streaming y lógica cámara  |
| Sonido (Flask)| 5020   | Activación de alarma en dispositivos |

---

## 6. Documentación adicional

- **README raíz:** [../README.md](../README.md)
- **Backend:** [../backend/README.md](../backend/README.md)
- **API:** [../backend/api/README.md](../backend/api/README.md) y [../backend/api/docs/API.md](../backend/api/docs/API.md)
- **Frontend:** [../frontend/README.md](../frontend/README.md)
- **Cámara:** [../backend/camara/README.md](../backend/camara/README.md)
- **Sonido:** [../backend/sonido/README.md](../backend/sonido/README.md)
