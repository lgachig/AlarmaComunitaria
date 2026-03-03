/**
 * Rutas de usuarios y autenticación: listado, registro y login.
 * Base path: /api (montado en simple-server.js)
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/** GET /api/users - Lista todos los usuarios (sin contraseña) */
router.get('/users', userController.getUsers);
/** POST /api/auth/register - Registro de nuevo usuario */
router.post('/auth/register', userController.registerUser);
/** POST /api/auth/login - Login; devuelve JWT y datos del usuario */
router.post('/auth/login', userController.loginUser);

module.exports = router;
