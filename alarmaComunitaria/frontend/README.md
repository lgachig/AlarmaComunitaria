# Frontend – Alarma Comunitaria (Angular)

Aplicación web del sistema **Alarma Comunitaria**: login, registro, mapa de puntos (robos, secuestros, cámaras), panel de notificaciones en tiempo real vía WebSocket y visualización del stream de cámara.

## De qué trata

- **Autenticación:** Login y registro; sesión con JWT.
- **Dashboard:** Mapa (Leaflet) con clusters de marcadores; puntos de tipo robo, secuestro y cámara.
- **Notificaciones:** Panel de notificaciones en tiempo real; conexión WebSocket a la API con reconexión automática.
- **Alertas:** Popup de alerta y formulario para enviar alertas manuales; recepción de alertas automáticas desde el módulo de cámara.
- **Cámara:** Vista del stream de video (URL configurable) cuando hay cámara disponible.

La app consume la API en `http://localhost:3000` (configurable en los servicios) y se conecta al WebSocket `ws://localhost:3000/ws` con el token JWT.

## Stack

- **Angular** 19.2
- **Leaflet** + **leaflet.markercluster** para el mapa
- **RxJS** para estado y flujos asíncronos
- **TypeScript** 5.7

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación y ejecución

```bash
npm install
ng serve
```

Abrir `http://localhost:4200`. La aplicación redirige a `/login` si no hay sesión; tras iniciar sesión se accede al dashboard.

## Scripts

| Comando | Descripción |
|--------|-------------|
| `npm start` / `ng serve` | Servidor de desarrollo en `http://localhost:4200` |
| `ng build` | Build de producción en `dist/` |
| `ng test` | Tests unitarios (Karma/Jasmine) |
| `ng e2e` | Tests e2e (configurar según el proyecto) |

## Estructura principal

```
src/app/
├── auth/           # Login, registro, guards de autenticación
├── Components/     # Dashboard (Inicio), mapa, alertas, notificaciones, popup, stream cámara
├── services/       # Auth, notificaciones, WebSocket, almacenamiento
└── Share/          # Interfaces, validadores, recursos compartidos
```

## Configuración de la API

La URL base de la API y del WebSocket suele estar en los servicios (p. ej. `AuthService`, `NotificationService`, `WebSocketService`). Por defecto se usa `http://localhost:3000` y `ws://localhost:3000/ws`. Para otro entorno, ajustar esas URLs en el código o mediante un archivo de entorno si se añade soporte.

## Rutas

- `` → redirección a `/login`
- `/login` → Inicio de sesión
- `/register` → Registro
- `/dashboard` → Panel principal (protegido con `AuthGuard`)
- `**` → redirección a `/login`

## Recursos

- [Angular CLI](https://angular.dev/tools/cli)
- [Documentación Angular](https://angular.dev)

Para el flujo completo del sistema (backend + frontend + cámara + sonido), ver [../docs/MANUAL_SISTEMA.md](../docs/MANUAL_SISTEMA.md).
