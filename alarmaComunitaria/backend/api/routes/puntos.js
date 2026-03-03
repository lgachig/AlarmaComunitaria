/**
 * Rutas de puntos del mapa (robo, secuestro, cámara).
 * Base path: /api/puntos
 */
const express = require('express');
const router = express.Router();
const puntosController = require('../controllers/puntosController');

/** GET /api/puntos - Lista todos los puntos */
router.get('/', puntosController.getPuntos);
/** POST /api/puntos - Crea un punto */
router.post('/', puntosController.createPunto);
/** POST /api/puntos/bulk - Crea múltiples puntos */
router.post('/bulk', puntosController.createPuntosBulk);

module.exports = router;
