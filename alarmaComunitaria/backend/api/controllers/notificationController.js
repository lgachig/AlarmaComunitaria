/**
 * Controlador de notificaciones: envía/recibe notificaciones, integra con WebSocket y con el módulo de cámara.
 */
let wsServer;

/**
 * Asigna la instancia del servidor WebSocket para broadcast y lista de notificaciones.
 * @param {import('../websocket-server')} server - Instancia de NotificationWebSocketServer
 */
const setWebSocketServer = (server) => {
  wsServer = server;
};

const Notification = require('../models/Notification');

/** Mapa de usuarios conectados y su ubicación: userId -> { lat, lon, ws } */
const connectedUsers = new Map();

/**
 * Calcula la distancia en km entre dos puntos por la fórmula de Haversine.
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en kilómetros
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Recibe el estado de la cámara (p. ej. activa/inactiva), lo guarda en MongoDB y hace broadcast a todos los clientes WebSocket.
 * @param {import('express').Request} req - body: { status }
 * @param {import('express').Response} res
 */
const recibirEstado = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Falta el campo 'status'" });
    }
    // Guardar en Mongo
    await Notification.create({ status });
    // Notificar a todos los clientes conectados (sin filtro de cercanía)
    wsServer.broadcast({ type: 'evento', status });
    return res.json({ status: true, message: 'Solicitud recibida' });
  } catch (error) {
    console.error('Error en recibirEstado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Recibe el detalle de una alerta enviada por el módulo de cámara (Python). Crea la notificación, la guarda en MongoDB,
 * la añade a la lista del WebSocket y hace broadcast a todos los clientes (new_notification y actualizar_camara).
 * @param {import('express').Request} req - body: { nombre_camara, ubicacion, fecha, alerta, informacion_extra }
 * @param {import('express').Response} res
 */
const recibirDetalleCamara = async (req, res) => {
  try {
    const data = req.body;
    console.log('📷 Detalle recibido de camara.py:', JSON.stringify(data, null, 2)); // <-- Log detallado
    // Mostrar en consola toda la información recibida
    console.log('🔔 Información recibida desde BACK-ENDV2:', JSON.stringify(data, null, 2));
    if (!data || !data.nombre_camara || !data.ubicacion || !data.fecha || !data.alerta || !data.informacion_extra) {
      return res.status(400).json({ error: 'Faltan campos' });
    }
    // Guardar en Mongo
    await Notification.create({ detalle: data, ubicacion: data.ubicacion, alertType: data.alerta, extra: data.informacion_extra });
    // Crear notificación estándar para WebSocket
    const notification = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title: `Alerta automática: ${data.alerta}`,
      message: `Cámara ${data.nombre_camara} detectó: ${data.alerta} el ${data.fecha}`,
      timestamp: new Date(),
      isRead: false,
      sender: {
        userId: 'camara-auto',
        email: 'camara@alarma.com',
        name: data.nombre_camara || 'Cámara'
      },
      metadata: {
        alertType: data.alerta,
        location: typeof data.ubicacion === 'object' && data.ubicacion.lat && data.ubicacion.lon
          ? `${data.ubicacion.lat}, ${data.ubicacion.lon}`
          : (typeof data.ubicacion === 'string' ? data.ubicacion : ''),
        lat: data.ubicacion?.lat,
        lng: data.ubicacion?.lon,
        imageUrl: data.informacion_extra?.imageUrl || null
      }
    };
    // Agregar a la lista global de notificaciones
    wsServer.getNotifications().push(notification);
    // Mantener solo las últimas 100
    if (wsServer.getNotifications().length > 100) {
      wsServer.getNotifications().splice(0, wsServer.getNotifications().length - 100);
    }
    // Notificar a todos los clientes conectados
    wsServer.broadcast({ type: 'new_notification', notification });
    // Además, emitir el evento específico de cámara (opcional)
    wsServer.broadcast({ type: 'actualizar_camara', detalle: data }, data.ubicacion);
    return res.json({ mensaje: 'Detalle recibido correctamente' });
  } catch (error) {
    console.error('Error en recibirDetalleCamara:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Registra la ubicación de un usuario conectado por WebSocket (para notificaciones por cercanía).
 * @param {string} userId
 * @param {number} lat
 * @param {number} lon
 * @param {import('ws')} ws
 */
const registrarUbicacion = (userId, lat, lon, ws) => {
  connectedUsers.set(userId, { lat, lon, ws });
};

/**
 * Elimina a un usuario del mapa de ubicaciones al desconectarse del WebSocket.
 * @param {string} userId
 */
const desconectarUsuario = (userId) => {
  connectedUsers.delete(userId);
};

/**
 * Envía un mensaje solo a los clientes WebSocket cuya ubicación está a ≤1 km del punto dado.
 * @param {{ lat: number, lon: number }} ubicacion
 * @param {object} payload - Objeto a enviar por WebSocket
 */
const notificarUsuariosCercanos = (ubicacion, payload) => {
  for (const [userId, info] of connectedUsers.entries()) {
    if (info.lat != null && info.lon != null) {
      const dist = calcularDistancia(info.lat, info.lon, ubicacion.lat, ubicacion.lon);
      if (dist <= 1) {
        info.ws.send(JSON.stringify(payload));
      }
    }
  }
};

/**
 * Crea y envía una notificación manual (requiere JWT). La añade a la lista del WebSocket y hace broadcast.
 * @param {import('express').Request} req - body: { title, message, alertType?, location, imageUrl? }; req.user del JWT
 * @param {import('express').Response} res
 */
const sendNotification = (req, res) => {
  try {
    const { title, message, alertType, location, imageUrl } = req.body;
    if (!title || !message || !location) {
      return res.status(400).json({
        message: 'Título, mensaje y ubicación son requeridos'
      });
    }
    const notification = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title,
      message,
      timestamp: new Date(),
      isRead: false,
      sender: {
        userId: req.user.userId,
        email: req.user.email,
        name: req.user.name
      },
      metadata: {
        alertType: alertType || 'general',
        location,
        imageUrl
      }
    };
    
    const notifications = wsServer.getNotifications();
    notifications.push(notification);
    wsServer.broadcast({ type: 'new_notification', notification });
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Devuelve la lista de notificaciones en memoria del WebSocket, ordenadas por fecha descendente (requiere JWT).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getNotifications = (req, res) => {
  try {
    const notifications = wsServer.getNotifications();
    const sortedNotifications = notifications.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    res.json(sortedNotifications);
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Crea una notificación de prueba (sin JWT) y hace broadcast. Útil para probar el WebSocket y el panel.
 * @param {import('express').Request} req - body opcional: { title, message, alertType, location, imageUrl }
 * @param {import('express').Response} res - { success, notification, connectedClients }
 */
const testNotification = (req, res) => {
  try {
    const { title, message, alertType, location, imageUrl } = req.body;
    const notification = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title: title || 'Alerta de Prueba',
      message: message || 'Esta es una notificación de prueba',
      timestamp: new Date(),
      isRead: false,
      sender: {
        userId: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      },
      metadata: {
        alertType: alertType || 'general',
        location: location || 'Quito, Ecuador',
        imageUrl: imageUrl || 'https://via.placeholder.com/300x200'
      }
    };
    const notifications = wsServer.getNotifications();
    notifications.push(notification);
    wsServer.broadcast({ type: 'new_notification', notification });
    res.json({
      success: true,
      notification,
      connectedClients: wsServer.getConnectedClients().length
    });
  } catch (error) {
    console.error('Error creando notificación de prueba:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Devuelve la lista de clientes conectados al WebSocket (requiere JWT).
 * @param {import('express').Request} req
 * @param {import('express').Response} res - { connectedClients, count }
 */
const getConnectedClients = (req, res) => {
  const clients = wsServer.getConnectedClients();
  res.json({
    connectedClients: clients,
    count: clients.length
  });
};

module.exports = {
  setWebSocketServer,
  sendNotification,
  getNotifications,
  testNotification,
  getConnectedClients,
  recibirEstado,
  recibirDetalleCamara,
  registrarUbicacion,
  desconectarUsuario,
  notificarUsuariosCercanos
};
