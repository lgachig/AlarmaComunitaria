# Backend – Alarma Comunitaria

El backend está dividido en tres partes: **API** (Node.js), **Cámara** (Python) y **Sonido** (Python). La API es el núcleo que conecta frontend, base de datos y notificaciones en tiempo real; cámara y sonido son servicios opcionales que se integran con ella.

## Resumen por módulo

| Módulo   | Propósito | Tecnología |
|----------|-----------|------------|
| **api/** | API REST + WebSocket, usuarios, puntos en mapa, notificaciones, recepción de alertas desde cámara | Node.js, Express, MongoDB, JWT, ws |
| **camara/** | Detección de riesgo (YOLOv8), streaming de video, grabación en evento, subida a B2, descripción con IA, envío de alertas a la API | Python, Flask, OpenCV, Ultralytics, Gemini, ngrok |
| **sonido/** | Activar alarma sonora en dispositivos (p. ej. Android) vía HTTP | Python, Flask |

## API (Node.js)

- **Puerto:** 3000 (HTTP y WebSocket).
- **Base de datos:** MongoDB (Mongoose). La URI se configura en `api/simple-server.js` (recomendado usar variables de entorno en producción).
- **Autenticación:** JWT. Login/registro en `/api/auth/login` y `/api/auth/register`. El WebSocket requiere `?token=<JWT>`.

**Documentación detallada:** [api/README.md](api/README.md) y [api/docs/API.md](api/docs/API.md).

**Ejecución:**

```bash
cd api
npm install
npm start
```

## Cámara (Python)

- Videovigilancia con detección (YOLOv8).
- En caso de evento, graba video, opcionalmente sube a Backblaze B2 y genera descripción con IA.
- Envía el detalle de la alerta al backend API (`POST /api/notifications/detalle`) para que se notifique a los clientes por WebSocket.

**Documentación detallada:** [camara/README.md](camara/README.md).

**Ejecución (resumen):** instalar dependencias desde la raíz del backend (`pip install -r requirements.txt`), configurar modelos YOLOv8 y credenciales B2, luego ejecutar el servidor de cámara según las instrucciones del README de `camara/`.

## Sonido (Python)

- Servidor Flask que expone un endpoint para “activar alarma”.
- Hace peticiones HTTP a una lista de dispositivos (p. ej. apps Android) para que reproduzcan el sonido de alarma.

**Documentación detallada:** [sonido/README.md](sonido/README.md).

**Ejecución (resumen):** instalar Flask, flask-cors y requests; configurar la lista de URLs de dispositivos en el código; ejecutar el script del servidor (por defecto en puerto 5020).

## Flujo de datos (resumen)

1. **Frontend** se conecta a la **API** (REST + WebSocket con JWT).
2. La **API** guarda usuarios, puntos del mapa y notificaciones; difunde notificaciones por WebSocket.
3. El módulo **Cámara** (si está activo) envía alertas a la API (`POST /api/notifications/detalle` y `/estado`); la API las persiste y las reenvía por WebSocket a los clientes.
4. El módulo **Sonido** se invoca de forma independiente (p. ej. desde un botón o integración externa) para activar las alarmas en dispositivos.

Para el flujo completo del sistema y configuración, ver [../docs/MANUAL_SISTEMA.md](../docs/MANUAL_SISTEMA.md).
