const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todos los productos
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM productos ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener productos' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un producto por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM productos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener producto' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un producto
router.post('/', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { nombre, tipo, precio, unidad, descripcion } = req.body;

  if (!nombre || !tipo || !precio || !unidad) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nombre, tipo, precio y unidad son requeridos' 
    });
  }

  db.run(
    'INSERT INTO productos (nombre, tipo, precio, unidad, descripcion) VALUES (?, ?, ?, ?, ?)',
    [nombre, tipo, precio, unidad, descripcion || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al crear producto' });
      }
      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: { id: this.lastID, nombre, tipo, precio, unidad, descripcion }
      });
    }
  );
});

// PUT - Actualizar un producto
router.put('/:id', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { nombre, tipo, precio, unidad, descripcion } = req.body;

  db.run(
    'UPDATE productos SET nombre = ?, tipo = ?, precio = ?, unidad = ?, descripcion = ? WHERE id = ?',
    [nombre, tipo, precio, unidad, descripcion || '', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar producto' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      res.json({ success: true, message: 'Producto actualizado exitosamente' });
    }
  );
});

// DELETE - Eliminar un producto
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar producto' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  });
});

module.exports = router;
