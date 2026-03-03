/**
 * Servidor WebSocket para notificaciones en tiempo real.
 * Autenticación por JWT en query (?token=). Mantiene lista de notificaciones en memoria y hace broadcast a los clientes.
 */
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const http = require('http');

class NotificationWebSocketServer {
  /**
   * @param {http.Server} server - Servidor HTTP sobre el que se monta el WebSocket
   * @param {string} jwtSecret - Secreto para verificar el JWT
   */
  constructor(server, jwtSecret) {
    this.wss = new WebSocket.Server({ server });
    this.jwtSecret = jwtSecret;
    this.clients = new Map(); // Map to store connected clients
    this.notifications = []; // In-memory storage for notifications

    this.initialize();
  }

  /** Inicializa el listener de conexiones WebSocket. */
  initialize() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('🔌 WebSocket server initialized');
  }

  /** Gestiona una nueva conexión: extrae token, verifica JWT, envía últimas notificaciones y registra handlers. */
  handleConnection(ws, req) {
    try {
      // Extract token from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Token required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret);
      const userId = decoded.userId || decoded.id;

      // Store client information
      this.clients.set(ws, {
        userId,
        email: decoded.email,
        name: decoded.name,
        connectedAt: new Date()
      });

      console.log(`👤 User ${userId} (${decoded.email}) connected`);

      // Send current notifications to new client
      this.sendToClient(ws, {
        type: 'notifications_list',
        notifications: this.notifications.slice(-50) // Last 50 notifications
      });

      // Handle messages from client
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });

    } catch (error) {
      console.error('Connection error:', error.message);
      ws.close(1008, 'Invalid token');
    }
  }

  /** Procesa mensajes del cliente: send_notification, mark_as_read, mark_all_read. */
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(ws);

      if (!client) {
        return;
      }

      switch (message.type) {
        case 'send_notification':
          this.handleNewNotification(ws, message.notification, client);
          break;

        case 'mark_as_read':
          this.handleMarkAsRead(ws, message.notificationId, client);
          break;

        case 'mark_all_read':
          this.handleMarkAllAsRead(ws, client);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /** Crea una notificación desde datos enviados por el cliente y hace broadcast. */
  handleNewNotification(ws, notificationData, sender) {
    try {
      // Create new notification
      const notification = {
        id: this.generateId(),
        title: notificationData.title,
        message: notificationData.message,
        timestamp: new Date(),
        isRead: false,
        sender: {
          userId: sender.userId,
          email: sender.email,
          name: sender.name
        },
        metadata: {
          alertType: notificationData.alertType,
          location: notificationData.location,
          imageUrl: notificationData.imageUrl
        }
      };

      // Add to notifications list
      this.notifications.push(notification);

      // Keep only last 100 notifications
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(-100);
      }

      // Broadcast to all connected clients
      this.broadcast({
        type: 'new_notification',
        notification
      });

      console.log(`📢 Notification sent by ${sender.email}: ${notification.title}`);

      // Send confirmation to sender
      this.sendToClient(ws, {
        type: 'notification_sent',
        notificationId: notification.id
      });

    } catch (error) {
      console.error('Error handling new notification:', error);
    }
  }

  /** Marca una notificación como leída y hace broadcast de la actualización. */
  handleMarkAsRead(ws, notificationId, client) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;

      // Broadcast update to all clients
      this.broadcast({
        type: 'notification_updated',
        notificationId,
        isRead: true
      });

      console.log(`✅ Notification ${notificationId} marked as read by ${client.email}`);
    }
  }

  /** Marca todas las notificaciones como leídas y hace broadcast. */
  handleMarkAllAsRead(ws, client) {
    this.notifications.forEach(notification => {
      notification.isRead = true;
    });

    // Broadcast update to all clients
    this.broadcast({
      type: 'all_notifications_read'
    });

    console.log(`✅ All notifications marked as read by ${client.email}`);
  }

  /** Elimina el cliente del mapa al cerrar la conexión. */
  handleDisconnect(ws) {
    const client = this.clients.get(ws);
    if (client) {
      console.log(`👋 User ${client.userId} (${client.email}) disconnected`);
      this.clients.delete(ws);
    }
  }

  /** Envía un mensaje a todos los clientes WebSocket conectados. */
  broadcast(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }

  /** Envía un mensaje a un único cliente si está OPEN. */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /** Genera un ID único para notificaciones. */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /** Devuelve el array de datos de clientes conectados (userId, email, name, connectedAt). */
  getConnectedClients() {
    return Array.from(this.clients.values());
  }

  /** Devuelve la referencia al array de notificaciones en memoria (para que el controlador pueda añadir/broadcast). */
  getNotifications() {
    return this.notifications;
  }
}

module.exports = NotificationWebSocketServer;
