const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_jwt_secret_super_seguro';

/**
 * Obtiene la lista de todos los usuarios registrados (sin incluir la contraseña).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

/**
 * Registra un nuevo usuario (nombre, email, contraseña). La contraseña se hashea con bcrypt en el modelo.
 * @param {import('express').Request} req - body: { name, email, password }
 * @param {import('express').Response} res
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    // Crear nuevo usuario
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Autentica al usuario con email y contraseña; devuelve un JWT y los datos del usuario.
 * @param {import('express').Request} req - body: { email, password }
 * @param {import('express').Response} res - { success, token, user: { id, name, email } }
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    // Generar JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getUsers,
  registerUser,
  loginUser
};
