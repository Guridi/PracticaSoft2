const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET - Obtener todos los almacenes
router.get('/', authenticateToken, (req, res) => {
  db.all(
    `SELECT a.*, 
            COALESCE(SUM(i.cantidad), 0) as usado,
            (a.capacidad_total - COALESCE(SUM(i.cantidad), 0)) as capacidad_disponible
     FROM almacenes a
     LEFT JOIN inventario_almacen i ON a.id = i.almacen_id
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener almacenes' });
      }
      res.json({ success: true, data: rows });
    }
  );
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
  const { nombre, ubicacion, capacidad_total } = req.body;

  if (!nombre || !ubicacion || !capacidad_total) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos los campos son requeridos' 
    });
  }

  db.run(
    'INSERT INTO almacenes (nombre, ubicacion, capacidad_total) VALUES (?, ?, ?)',
    [nombre, ubicacion, capacidad_total],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al crear almacén' });
      }
      res.status(201).json({
        success: true,
        message: 'Almacén creado exitosamente',
        data: { id: this.lastID, nombre, ubicacion, capacidad_total }
      });
    }
  );
});

// PUT - Actualizar un almacén
router.put('/:id', authenticateToken, (req, res) => {
  const { nombre, ubicacion, capacidad_total } = req.body;

  db.run(
    'UPDATE almacenes SET nombre = ?, ubicacion = ?, capacidad_total = ? WHERE id = ?',
    [nombre, ubicacion, capacidad_total, req.params.id],
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
