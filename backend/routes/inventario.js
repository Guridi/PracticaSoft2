const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET - Obtener inventario de un almacén específico
router.get('/almacen/:id', authenticateToken, (req, res) => {
  db.all(
    `SELECT i.*, 
            p.nombre as producto_nombre, 
            p.tipo, 
            p.unidad,
            p.precio
     FROM inventario_almacen i
     JOIN productos p ON i.producto_id = p.id
     WHERE i.almacen_id = ?
     ORDER BY i.fecha_ingreso DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener inventario' });
      }
      res.json({ success: true, data: rows });
    }
  );
});

// POST - Agregar producto al almacén
router.post('/', authenticateToken, (req, res) => {
  const { almacen_id, producto_id, cantidad } = req.body;

  if (!almacen_id || !producto_id || !cantidad) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos los campos son requeridos' 
    });
  }

  // Verificar capacidad disponible del almacén
  db.get(
    `SELECT a.capacidad_total, 
            COALESCE(SUM(i.cantidad), 0) as usado
     FROM almacenes a
     LEFT JOIN inventario_almacen i ON a.id = i.almacen_id
     WHERE a.id = ?
     GROUP BY a.id`,
    [almacen_id],
    (err, almacen) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al verificar capacidad' });
      }

      if (!almacen) {
        return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
      }

      const disponible = almacen.capacidad_total - almacen.usado;
      
      if (cantidad > disponible) {
        return res.status(400).json({ 
          success: false, 
          message: `Capacidad insuficiente. Disponible: ${disponible.toFixed(2)}` 
        });
      }

      // Verificar si ya existe el producto en el inventario
      db.get(
        'SELECT * FROM inventario_almacen WHERE almacen_id = ? AND producto_id = ?',
        [almacen_id, producto_id],
        (err, existente) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al verificar inventario' });
          }

          if (existente) {
            // Actualizar cantidad existente
            db.run(
              'UPDATE inventario_almacen SET cantidad = cantidad + ? WHERE id = ?',
              [cantidad, existente.id],
              function(err) {
                if (err) {
                  return res.status(500).json({ success: false, message: 'Error al actualizar inventario' });
                }
                res.json({ 
                  success: true, 
                  message: 'Cantidad actualizada en el inventario',
                  id: existente.id 
                });
              }
            );
          } else {
            // Insertar nuevo producto en inventario
            db.run(
              'INSERT INTO inventario_almacen (almacen_id, producto_id, cantidad) VALUES (?, ?, ?)',
              [almacen_id, producto_id, cantidad],
              function(err) {
                if (err) {
                  return res.status(500).json({ success: false, message: 'Error al agregar producto' });
                }
                res.json({ 
                  success: true, 
                  message: 'Producto agregado al almacén',
                  id: this.lastID 
                });
              }
            );
          }
        }
      );
    }
  );
});

// PUT - Actualizar cantidad de producto en inventario
router.put('/:id', authenticateToken, (req, res) => {
  const { cantidad } = req.body;

  if (!cantidad) {
    return res.status(400).json({ success: false, message: 'La cantidad es requerida' });
  }

  // Obtener información del inventario actual
  db.get(
    `SELECT i.*, a.capacidad_total,
            (SELECT COALESCE(SUM(cantidad), 0) FROM inventario_almacen WHERE almacen_id = i.almacen_id AND id != i.id) as otros_productos
     FROM inventario_almacen i
     JOIN almacenes a ON i.almacen_id = a.id
     WHERE i.id = ?`,
    [req.params.id],
    (err, item) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener inventario' });
      }

      if (!item) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado en inventario' });
      }

      const disponible = item.capacidad_total - item.otros_productos;

      if (cantidad > disponible) {
        return res.status(400).json({ 
          success: false, 
          message: `Capacidad insuficiente. Disponible: ${disponible.toFixed(2)}` 
        });
      }

      db.run(
        'UPDATE inventario_almacen SET cantidad = ? WHERE id = ?',
        [cantidad, req.params.id],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al actualizar cantidad' });
          }
          res.json({ success: true, message: 'Cantidad actualizada exitosamente' });
        }
      );
    }
  );
});

// DELETE - Eliminar producto del inventario
router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM inventario_almacen WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado en inventario' });
    }
    res.json({ success: true, message: 'Producto eliminado del inventario' });
  });
});

module.exports = router;
