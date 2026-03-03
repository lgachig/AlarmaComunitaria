const mongoose = require('mongoose');
const Punto = require('../models/Punto');

/**
 * Obtiene todos los puntos del mapa (robo, secuestro, cámara) desde la base de datos.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getPuntos = async (req, res) => {
  try {
    const puntos = await Punto.find();
    res.json(puntos);
  } catch (err) {
    console.error('Error al obtener puntos:', err);
    res.status(500).json({ error: 'Error al obtener puntos' });
  }
};

/**
 * Crea un nuevo punto en el mapa. Si no se envía usuarioId válido, se usa un ObjectId de ejemplo.
 * @param {import('express').Request} req - body: tipo, lat, lng, titulo, descripcion, fecha?, usuarioId?, direccion?
 * @param {import('express').Response} res
 */
const createPunto = async (req, res) => {
  try {
    // Si no hay usuarioId válido, usar uno de prueba
    let usuarioId = req.body.usuarioId;
    if (!usuarioId || !mongoose.Types.ObjectId.isValid(usuarioId)) {
      usuarioId = "000000000000000000000000"; // ObjectId de ejemplo
    }
    const puntoData = {
      ...req.body,
      usuarioId: new mongoose.Types.ObjectId(usuarioId)
    };
    const punto = new Punto(puntoData);
    const savedPunto = await punto.save();
    const puntoConUsuario = await Punto.findById(savedPunto._id).populate('usuarioId', 'name email');
    res.status(201).json(puntoConUsuario);
  } catch (err) {
    console.error('Error al guardar punto:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ errors });
    }
    res.status(500).json({ error: 'Error al guardar el punto' });
  }
};

/**
 * Crea múltiples puntos en una sola petición. Espera un array de objetos con la misma estructura que createPunto.
 * @param {import('express').Request} req - body: Array<{ tipo, lat, lng, titulo, descripcion, usuarioId, ... }>
 * @param {import('express').Response} res
 */
const createPuntosBulk = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Se espera un array de puntos' });
    }
    // Validar y transformar usuarioId
    const puntosData = req.body.map(punto => ({
      ...punto,
      usuarioId: new mongoose.Types.ObjectId(punto.usuarioId)
    }));
    const puntos = await Punto.insertMany(puntosData);
    res.status(201).json(puntos);
  } catch (err) {
    console.error('Error al guardar múltiples puntos:', err);
    res.status(500).json({ error: 'Error al guardar puntos' });
  }
};

module.exports = {
  getPuntos,
  createPunto,
  createPuntosBulk
};
