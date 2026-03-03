# Alarma Comunitaria – Módulo Cámara (Detección y Alerta en Tiempo Real)

Módulo de **videovigilancia inteligente** que detecta situaciones de riesgo (armas, personas) en tiempo real con YOLOv8 y Gemini AI, graba evidencia, la sube a Backblaze B2 y notifica a la API central para que los clientes reciban alertas por WebSocket.

## Descripción

- **Detección:** YOLOv8 (Ultralytics) para objetos (armas, personas, etc.) en el flujo de la cámara.
- **Grabación:** Solo cuando se detecta un evento de interés; el video se guarda localmente.
- **Nube:** Subida automática a Backblaze B2 para resguardo.
- **Descripción:** Generación de descripción del evento con IA (Gemini).
- **Notificaciones:** Envío del detalle a la API Node.js (`POST /api/notifications/detalle`) para que se difunda por WebSocket a la interfaz web.
- **Streaming:** Flujo MJPEG para visualización en vivo; opcionalmente exposición pública con ngrok.

## Estructura actual (dentro de este repo)

```
backend/
├── camara/
│   ├── camara.py           # Lógica de detección (YOLOv8) y captura
│   ├── servidorcamara.py   # Servidor Flask: streaming, ngrok, descripción, envío a API
│   ├── descripcionvideo.py # Descripción automática del video con IA (Gemini)
│   ├── ngrok_url_camara.py # Gestión de túneles ngrok
│   ├── modelos/            # Pesos de modelos (p. ej. YOLOv8)
│   └── README.md           # Este archivo
├── requirements.txt       # Dependencias Python (raíz backend)
└── ...
```

## Instalación

1. Clonar el repositorio y ubicarse en el backend:
   ```bash
   cd alarmaComunitaria/backend
   ```

2. Instalar dependencias Python:
   ```bash
   pip install -r requirements.txt
   ```

3. **Modelos YOLOv8:**  
   Colocar los archivos de pesos (`best.pt`, `yolov8n.pt`, etc.) en las rutas que use `camara/camara.py`.

4. **Backblaze B2:**  
   Configurar credenciales (recomendado usar variables de entorno o archivo de configuración; evitar credenciales fijas en código en producción).

5. **API Node:**  
   La API debe estar corriendo (p. ej. `http://localhost:3000`). En `servidorcamara.py` (o el script que envía el detalle) debe estar configurada la URL base de la API y el endpoint `POST /api/notifications/detalle` (y opcionalmente `/estado`).

## Ejecución

1. Iniciar la **API** (Node.js):
   ```bash
   cd api && npm start
   ```

2. Iniciar el **servidor de cámara** (desde `backend/camara` o con `PYTHONPATH` adecuado):
   ```bash
   cd camara
   python servidorcamara.py
   ```
   - Flask corre en un puerto disponible (p. ej. 5001–5010).
   - Si se usa ngrok, la URL pública se imprime en consola.

3. Acceder al streaming:
   - Local: `http://localhost:<puerto>/`
   - Público: URL de ngrok si está configurado.

4. Probar: generar un evento detectado (p. ej. objeto clasificado como arma); el sistema debe grabar, procesar, enviar el detalle a la API y los clientes conectados por WebSocket recibirán la notificación.

## Detalles técnicos

- **Detección:** OpenCV + YOLOv8 en tiempo real sobre el flujo de video.
- **Almacenamiento:** Videos subidos a Backblaze B2 (configurar bucket y credenciales).
- **Descripción:** Gemini AI para generar texto descriptivo del evento a partir del video.
- **Notificaciones:** HTTP POST a la API Node; la API guarda en MongoDB y hace broadcast por WebSocket.
- **Geolocalización:** El detalle enviado a la API puede incluir ubicación para mostrar la alerta en el mapa del frontend.

## Seguridad

- No dejar credenciales de B2 o APIs en el código; usar variables de entorno o gestor de secretos.
- En producción, restringir acceso al streaming y a los endpoints de la cámara; ngrok solo para desarrollo/pruebas si aplica.

## Créditos

Desarrollado por Grupo 6 (Javier Saransig, Carlos Patiño, Luis Achig).  
Basado en YOLOv8 (Ultralytics) y Gemini AI.
