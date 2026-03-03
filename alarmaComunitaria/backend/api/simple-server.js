/**
 * Servidor principal de la API Alarma Comunitaria: Express (REST), MongoDB y WebSocket.
 * Puerto por defecto: 3000. WebSocket en el mismo servidor HTTP (path /ws).
 */
// =========================
//        IMPORTS
// =========================
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Importar el servidor WebSocket
const NotificationWebSocketServer = require('./websocket-server');
const notificationController = require('./controllers/notificationController');

// --- Importar routers ---
const usersRouter = require('./routes/users');
const notificationsRouterFactory = require('./routes/notifications');

// =========================
//   CONFIGURACIÓN GLOBAL
// =========================
const app = express();
const server = http.createServer(app);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_jwt_secret_super_seguro';

// =========================
//   CONEXIÓN A MONGODB
// =========================
mongoose.connect('mongodb+srv://elluis20026:CRUZlucho.com@practica.81cgj.mongodb.net/alarmaComunitaria', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB conectado exitosamente');
})
.catch((error) => {
  console.error('❌ Error conectando a MongoDB:', error);
});

// =========================
//      MIDDLEWARES
// =========================
app.use(cors());
app.use(express.json());

// =========================
//   INICIALIZACIÓN WS
// =========================
const wsServer = new NotificationWebSocketServer(server, JWT_SECRET);
app.locals.notificationServer = wsServer;
notificationController.setWebSocketServer(wsServer);

// =========================
//      RUTA DE PRUEBA
// =========================
app.get('/', (req, res) => {
  res.json({ message: 'API de Alarma Comunitaria funcionando' });
});

// =========================
//      AUTENTICACIÓN
// =========================
/** Middleware: verifica JWT en Authorization: Bearer <token> y asigna req.user (userId, email, name). */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// =========================
//         RUTAS
// =========================
// --- Usar routers ---
app.use('/api/puntos', require('./routes/puntos'));
app.use('/api', usersRouter);
app.use('/api/notifications', notificationsRouterFactory(wsServer, authenticateToken));

// =========================
//   INICIAR SERVIDOR
// =========================
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔌 WebSocket server iniciado`);
  console.log(`📊 URL: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket URL: ws://localhost:${PORT}/ws`);
});
