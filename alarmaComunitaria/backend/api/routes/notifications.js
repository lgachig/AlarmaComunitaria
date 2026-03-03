/**
 * Rutas de notificaciones: envío, listado, prueba, clientes conectados e integración con el módulo cámara.
 * Base path: /api/notifications. Factory que recibe wsServer y middleware authenticateToken.
 */
const express = require('express');
const notificationController = require('../controllers/notificationController');

module.exports = (wsServer, authenticateToken) => {
  notificationController.setWebSocketServer(wsServer);
  const router = express.Router();
  /** POST / - Enviar notificación (JWT) */
  router.post('/', authenticateToken, notificationController.sendNotification);
  /** GET / - Listar notificaciones (JWT) */
  router.get('/', authenticateToken, notificationController.getNotifications);
  /** POST /test - Notificación de prueba (sin JWT) */
  router.post('/test', notificationController.testNotification);
  /** GET /connected-clients - Clientes WebSocket conectados (JWT) */
  router.get('/connected-clients', notificationController.getConnectedClients);
  /** POST /detalle - Recibir detalle de alerta desde el módulo cámara (Python) */
  router.post('/detalle', notificationController.recibirDetalleCamara);
  /** POST /estado - Recibir estado de la cámara */
  router.post('/estado', notificationController.recibirEstado);
  return router;
};
