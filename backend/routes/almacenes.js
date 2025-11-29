const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET - Obtener todos los almacenes
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM almacenes ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener almacenes' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un almacén por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM almacenes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener almacén' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un almacén
router.post('/', authenticateToken, (req, res) => {
  const { nombre, ubicacion, capacidad_total, capacidad_disponible, tipo_producto } = req.body;

  if (!nombre || !ubicacion || !capacidad_total || capacidad_disponible === undefined || !tipo_producto) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos los campos son requeridos' 
    });
  }

  db.run(
    'INSERT INTO almacenes (nombre, ubicacion, capacidad_total, capacidad_disponible, tipo_producto) VALUES (?, ?, ?, ?, ?)',
    [nombre, ubicacion, capacidad_total, capacidad_disponible, tipo_producto],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al crear almacén' });
      }
      res.status(201).json({
        success: true,
        message: 'Almacén creado exitosamente',
        data: { id: this.lastID, nombre, ubicacion, capacidad_total, capacidad_disponible, tipo_producto }
      });
    }
  );
});

// PUT - Actualizar un almacén
router.put('/:id', authenticateToken, (req, res) => {
  const { nombre, ubicacion, capacidad_total, capacidad_disponible, tipo_producto } = req.body;

  db.run(
    'UPDATE almacenes SET nombre = ?, ubicacion = ?, capacidad_total = ?, capacidad_disponible = ?, tipo_producto = ? WHERE id = ?',
    [nombre, ubicacion, capacidad_total, capacidad_disponible, tipo_producto, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar almacén' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
      }
      res.json({ success: true, message: 'Almacén actualizado exitosamente' });
    }
  );
});

// DELETE - Eliminar un almacén
router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM almacenes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar almacén' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
    }
    res.json({ success: true, message: 'Almacén eliminado exitosamente' });
  });
});

module.exports = router;
