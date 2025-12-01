const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todas las órdenes
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT o.*, 
           c.nombre as cliente_nombre,
           p.nombre as producto_nombre,
           d.nombre as delivery_nombre,
           a.nombre as almacen_nombre
    FROM ordenes o
    LEFT JOIN clientes c ON o.cliente_id = c.id
    LEFT JOIN productos p ON o.producto_id = p.id
    LEFT JOIN deliveries d ON o.delivery_id = d.id
    LEFT JOIN almacenes a ON o.almacen_id = a.id
    ORDER BY o.fecha_solicitud DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener una orden por ID
router.get('/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT o.*, 
           c.nombre as cliente_nombre,
           p.nombre as producto_nombre,
           d.nombre as delivery_nombre,
           a.nombre as almacen_nombre
    FROM ordenes o
    LEFT JOIN clientes c ON o.cliente_id = c.id
    LEFT JOIN productos p ON o.producto_id = p.id
    LEFT JOIN deliveries d ON o.delivery_id = d.id
    LEFT JOIN almacenes a ON o.almacen_id = a.id
    WHERE o.id = ?
  `;
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener orden' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear una orden
router.post('/', authenticateToken, authorize(['admin', 'empleado', 'cliente']), (req, res) => {
  const { 
    cliente_id, producto_id, delivery_id, almacen_id, 
    volumen_solicitado, ubicacion_entrega, ventana_entrega_inicio, 
    ventana_entrega_fin, precio_unitario, notas 
  } = req.body;

  if (!cliente_id || !producto_id || !almacen_id || !volumen_solicitado || !ubicacion_entrega) {
    return res.status(400).json({ 
      success: false, 
      message: 'Cliente, producto, almacén, volumen y ubicación son requeridos' 
    });
  }

  // Verificar disponibilidad del producto en el almacén
  db.get(
    'SELECT cantidad FROM inventario_almacen WHERE almacen_id = ? AND producto_id = ?',
    [almacen_id, producto_id],
    (err, inventario) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al verificar inventario' });
      }

      if (!inventario || inventario.cantidad < volumen_solicitado) {
        return res.status(400).json({ 
          success: false, 
          message: `Producto insuficiente en almacén. Disponible: ${inventario ? inventario.cantidad : 0}` 
        });
      }

      const total = precio_unitario ? precio_unitario * volumen_solicitado : null;

      // Reducir cantidad del inventario (producto sale del almacén)
      db.run(
        'UPDATE inventario_almacen SET cantidad = cantidad - ? WHERE almacen_id = ? AND producto_id = ?',
        [volumen_solicitado, almacen_id, producto_id],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al actualizar inventario' });
          }

          // Crear la orden
          db.run(
            `INSERT INTO ordenes (
              cliente_id, producto_id, delivery_id, almacen_id, 
              volumen_solicitado, ubicacion_entrega, ventana_entrega_inicio,
              ventana_entrega_fin, precio_unitario, total, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cliente_id, producto_id, delivery_id || null, almacen_id,
              volumen_solicitado, ubicacion_entrega, ventana_entrega_inicio || null,
              ventana_entrega_fin || null, precio_unitario || null, total, notas || ''
            ],
            function(err) {
              if (err) {
                return res.status(500).json({ success: false, message: 'Error al crear orden' });
              }

              res.status(201).json({
                success: true,
                message: 'Orden creada exitosamente',
                data: { id: this.lastID }
              });
            }
          );
        }
      );
    }
  );
});

// PUT - Actualizar una orden
router.put('/:id', authenticateToken, authorize(['admin', 'empleado', 'transportista']), (req, res) => {
  const { 
    cliente_id, producto_id, delivery_id, almacen_id,
    volumen_solicitado, volumen_entregado, estado,
    ubicacion_entrega, fecha_entrega, precio_unitario, notas
  } = req.body;

  const total = precio_unitario && volumen_solicitado ? precio_unitario * volumen_solicitado : null;

  db.run(
    `UPDATE ordenes SET 
      cliente_id = ?, producto_id = ?, delivery_id = ?, almacen_id = ?,
      volumen_solicitado = ?, volumen_entregado = ?, estado = ?,
      ubicacion_entrega = ?, fecha_entrega = ?, precio_unitario = ?,
      total = ?, notas = ?
    WHERE id = ?`,
    [
      cliente_id, producto_id, delivery_id, almacen_id,
      volumen_solicitado, volumen_entregado || null, estado || 'pendiente',
      ubicacion_entrega, fecha_entrega || null, precio_unitario || null,
      total, notas || '', req.params.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar orden' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }
      res.json({ success: true, message: 'Orden actualizada exitosamente' });
    }
  );
});

// DELETE - Eliminar una orden
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  // Primero obtener la orden para devolver el producto al inventario
  db.get(
    'SELECT almacen_id, producto_id, volumen_solicitado, estado FROM ordenes WHERE id = ?', 
    [req.params.id], 
    (err, orden) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener orden' });
      }
      if (!orden) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }

      db.run('DELETE FROM ordenes WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error al eliminar orden' });
        }

        // Si la orden no fue entregada, devolver el producto al inventario
        if (orden.estado !== 'entregado') {
          db.run(
            `UPDATE inventario_almacen 
             SET cantidad = cantidad + ? 
             WHERE almacen_id = ? AND producto_id = ?`,
            [orden.volumen_solicitado, orden.almacen_id, orden.producto_id],
            (err) => {
              if (err) {
                console.error('Error al devolver producto al inventario:', err);
              }
            }
          );
        }

        res.json({ success: true, message: 'Orden eliminada exitosamente' });
      });
    }
  );
});

module.exports = router;
