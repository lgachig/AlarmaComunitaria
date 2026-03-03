# Alarma Comunitaria

Sistema integral de **alerta comunitaria** que combina videovigilancia inteligente, notificaciones en tiempo real y un mapa de puntos de interés (robos, secuestros, cámaras) para mejorar la seguridad vecinal.

## Descripción

Alarma Comunitaria permite a los usuarios:

- **Registrarse y autenticarse** en la plataforma.
- **Visualizar en un mapa** puntos reportados (robos, secuestros, ubicación de cámaras).
- **Recibir notificaciones en tiempo real** vía WebSocket cuando hay alertas (manuales o automáticas desde cámaras).
- **Integrar cámaras con IA** que detectan situaciones de riesgo (armas, personas), graban evidencia, la suben a la nube y notifican automáticamente.
- **Activar alarmas sonoras** en dispositivos configurados (módulo sonido).

## Estructura del proyecto

```
alarmaComunitaria/
├── frontend/          # Aplicación web Angular 19 (mapa, login, notificaciones)
├── backend/           # Servicios backend
│   ├── api/           # API REST + WebSocket (Node.js/Express, MongoDB)
│   ├── camara/        # Detección con YOLOv8, streaming, ngrok, descripción con IA
│   └── sonido/        # Servidor Flask para activar alarmas en dispositivos
├── docs/              # Manual del sistema y documentación
└── README.md          # Este archivo
```

## Tecnologías principales

| Parte      | Stack |
|-----------|--------|
| Frontend  | Angular 19, Leaflet, RxJS |
| API       | Node.js, Express, MongoDB (Mongoose), JWT, WebSocket (ws) |
| Cámara    | Python, Flask, OpenCV, YOLOv8 (Ultralytics), Gemini, Backblaze B2, ngrok |
| Sonido    | Python, Flask, requests |

## Inicio rápido

1. **Requisitos:** Node.js 18+, MongoDB (o URI en la nube), Python 3.10+ (para cámara/sonido).
2. **Backend API:**  
   `cd backend/api && npm install && npm start`  
   Servidor en `http://localhost:3000`, WebSocket en `ws://localhost:3000/ws`.
3. **Frontend:**  
   `cd frontend && npm install && ng serve`  
   App en `http://localhost:4200`.
4. **Cámara (opcional):**  
   `cd backend/camara && pip install -r ../requirements.txt`  
   Ver `backend/camara/README.md` para ejecutar el servidor de cámara.
5. **Sonido (opcional):**  
   `cd backend/sonido && pip install flask flask-cors requests`  
   Ver `backend/sonido/README.md` para activar alarmas.

Para un flujo detallado, variables de entorno y configuración, consulta **[Manual del sistema](docs/MANUAL_SISTEMA.md)**.

## Documentación

- [README Frontend](frontend/README.md) — Cómo ejecutar y desarrollar la app Angular.
- [README Backend](backend/README.md) — Descripción de API, cámara y sonido.
- [Manual del sistema](docs/MANUAL_SISTEMA.md) — Funcionamiento completo, despliegue y configuración.
- [Documentación API (backend)](backend/api/docs/API.md) — Endpoints REST y WebSocket.

## Créditos

Desarrollado por Grupo 6 (Javier Saransig, Carlos Patiño, Luis Achig).  
Utiliza YOLOv8 (Ultralytics), Gemini AI y tecnologías open source mencionadas arriba.
