const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

// Función helper para formatear fecha
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

// Reporte de Clientes
router.get('/clientes', authenticateToken, authorize(['admin', 'empleado']), async (req, res) => {
  try {
    const clientes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users WHERE role = "cliente"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_clientes.pdf');
    doc.pipe(res);

    // Header con logo e info del usuario
    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    // Título
    doc.fillColor('#000000').fontSize(18).text('Reporte de Clientes', 50, 130, { align: 'center' });
    doc.moveDown(2);

    // Detalles
    doc.fontSize(10);
    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${clientes.length}`, 70, detallesY + 50)
       .text('Tipo: Clientes', 70, detallesY + 70);

    // Tabla
    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cédula', 250, tableTop);
    doc.text('Teléfono', 350, tableTop);
    doc.text('Email', 450, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    clientes.forEach((cliente, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return; // Evitar desbordamiento de página
      doc.text(cliente.id, 50, y);
      doc.text(cliente.nombre || '-', 100, y, { width: 140 });
      doc.text(cliente.cedula || '-', 250, y);
      doc.text(cliente.telefono || '-', 350, y);
      doc.text(cliente.email || '-', 450, y, { width: 100 });
    });

    doc.end();
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Empleados
router.get('/empleados', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const empleados = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users WHERE role = "empleado"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_empleados.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Empleados', 50, 130, { align: 'center' });
    doc.moveDown(2);

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${empleados.length}`, 70, detallesY + 50)
       .text('Tipo: Empleados', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cédula', 250, tableTop);
    doc.text('Teléfono', 350, tableTop);
    doc.text('Email', 450, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    empleados.forEach((empleado, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(empleado.id, 50, y);
      doc.text(empleado.nombre || '-', 100, y, { width: 140 });
      doc.text(empleado.cedula || '-', 250, y);
      doc.text(empleado.telefono || '-', 350, y);
      doc.text(empleado.email || '-', 450, y, { width: 100 });
    });

    doc.end();
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Productos
router.get('/productos', authenticateToken, authorize(['admin', 'empleado']), async (req, res) => {
  try {
    const productos = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM productos', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_productos.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Productos', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${productos.length}`, 70, detallesY + 50)
       .text('Tipo: Productos', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Tipo', 250, tableTop);
    doc.text('Precio', 350, tableTop);
    doc.text('Unidad', 430, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    productos.forEach((producto, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(producto.id, 50, y);
      doc.text(producto.nombre || '-', 100, y, { width: 140 });
      doc.text(producto.tipo || '-', 250, y);
      doc.text(`$${producto.precio || 0}`, 350, y);
      doc.text(producto.unidad || '-', 430, y);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Almacenes
router.get('/almacenes', authenticateToken, authorize(['admin', 'empleado']), async (req, res) => {
  try {
    const almacenes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM almacenes', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_almacenes.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Almacenes', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${almacenes.length}`, 70, detallesY + 50)
       .text('Tipo: Almacenes', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Ubicación', 250, tableTop);
    doc.text('Capacidad Total', 380, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    almacenes.forEach((almacen, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(almacen.id, 50, y);
      doc.text(almacen.nombre || '-', 100, y, { width: 140 });
      doc.text(almacen.ubicacion || '-', 250, y, { width: 120 });
      doc.text(almacen.capacidad_total || '0', 380, y);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Choferes
router.get('/choferes', authenticateToken, authorize(['admin', 'empleado', 'transportista']), async (req, res) => {
  try {
    const choferes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM deliveries', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_choferes.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Choferes', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${choferes.length}`, 70, detallesY + 50)
       .text('Tipo: Choferes', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cédula', 230, tableTop);
    doc.text('Licencia', 330, tableTop);
    doc.text('Placa', 430, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    choferes.forEach((chofer, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(chofer.id, 50, y);
      doc.text(chofer.nombre || '-', 100, y, { width: 120 });
      doc.text(chofer.cedula || '-', 230, y);
      doc.text(chofer.licencia || '-', 330, y);
      doc.text(chofer.vehiculo_placa || '-', 430, y);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Órdenes
router.get('/ordenes', authenticateToken, authorize(['admin', 'empleado', 'cliente']), async (req, res) => {
  try {
    const ordenes = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.nombre as cliente_nombre, p.nombre as producto_nombre
        FROM ordenes o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN productos p ON o.producto_id = p.id
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_ordenes.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Órdenes', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${ordenes.length}`, 70, detallesY + 50)
       .text('Tipo: Órdenes', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 30;
    
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Producto', 90, tableTop);
    doc.text('Volumen', 200, tableTop);
    doc.text('Dirección', 270, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(8);
    ordenes.forEach((orden, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(orden.id, 50, y);
      doc.text(orden.producto_nombre || '-', 90, y, { width: 100 });
      doc.text(orden.volumen_solicitado || '0', 200, y);
      doc.text(orden.ubicacion_entrega || '-', 270, y, { width: 280 });
    });

    doc.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Factura Individual de Orden
router.get('/factura/:ordenId', authenticateToken, async (req, res) => {
  try {
    const ordenId = req.params.ordenId;

    // Obtener datos de la orden con joins
    const orden = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          o.*,
          u.nombre as cliente_nombre, u.email as cliente_email, u.telefono as cliente_telefono, u.direccion as cliente_direccion,
          p.nombre as producto_nombre, p.tipo as producto_tipo, p.unidad as producto_unidad,
          a.nombre as almacen_nombre, a.ubicacion as almacen_ubicacion,
          d.nombre as chofer_nombre
         FROM ordenes o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN productos p ON o.producto_id = p.id
         LEFT JOIN almacenes a ON o.almacen_id = a.id
         LEFT JOIN users d ON o.delivery_id = d.id
         WHERE o.id = ?`,
        [ordenId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura_orden_${ordenId}.pdf`);
    doc.pipe(res);

    // Header - Título principal
    doc.rect(50, 50, 512, 80).fill('#667eea');
    doc.fontSize(24).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('FACTURA', 50, 70, { align: 'center', width: 512 });
    doc.fontSize(12).font('Helvetica')
       .text(`Orden #${ordenId}`, 50, 100, { align: 'center', width: 512 });
    
    // Fecha de emisión
    doc.fontSize(10)
       .text(`Fecha de Emisión: ${formatDate(new Date())}`, 50, 120, { align: 'right', width: 512 });

    // Información del cliente
    let yPos = 160;
    doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
       .text('Información del Cliente', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica')
       .text(`Nombre: ${orden.cliente_nombre}`, 50, yPos)
       .text(`Email: ${orden.cliente_email || 'N/A'}`, 50, yPos + 15)
       .text(`Teléfono: ${orden.cliente_telefono || 'N/A'}`, 50, yPos + 30)
       .text(`Dirección: ${orden.cliente_direccion || 'N/A'}`, 50, yPos + 45);

    // Detalles de la orden
    yPos += 90;
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Detalles de la Orden', 50, yPos);

    yPos += 25;
    doc.fontSize(10).font('Helvetica')
       .text(`Producto: ${orden.producto_nombre} (${orden.producto_tipo})`, 50, yPos)
       .text(`Unidad: ${orden.producto_unidad}`, 50, yPos + 15)
       .text(`Cantidad: ${orden.volumen_solicitado} ${orden.producto_unidad}(s)`, 50, yPos + 30)
       .text(`Ubicación de Entrega: ${orden.ubicacion_entrega}`, 50, yPos + 45)
       .text(`Almacén: ${orden.almacen_nombre} - ${orden.almacen_ubicacion || ''}`, 50, yPos + 60)
       .text(`Chofer: ${orden.chofer_nombre || 'No asignado'}`, 50, yPos + 75)
       .text(`Método de Pago: ${orden.payment_method || 'No especificado'}`, 50, yPos + 90)
       .text(`Estado: ${orden.estado}`, 50, yPos + 105)
       .text(`Pagado: ${orden.pagado ? 'Sí' : 'No'}`, 50, yPos + 120);

    // Desglose de costos
    yPos += 160;
    doc.rect(50, yPos, 512, 150).stroke('#e2e8f0');
    
    yPos += 20;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#667eea')
       .text('Desglose de Costos', 50, yPos, { align: 'center', width: 512 });

    yPos += 30;
    const subtotal = (orden.total || 0) / 1.18; // Calcular subtotal sin ITBIS
    const itbis = subtotal * 0.18;
    const total = orden.total || 0;

    doc.fontSize(11).font('Helvetica').fillColor('#000000');
    
    // Subtotal
    doc.text('Subtotal:', 80, yPos, { width: 350 });
    doc.text(`RD$ ${subtotal.toFixed(2)}`, 430, yPos, { align: 'right', width: 100 });
    
    // ITBIS
    yPos += 20;
    doc.text('ITBIS (18%):', 80, yPos, { width: 350 });
    doc.text(`RD$ ${itbis.toFixed(2)}`, 430, yPos, { align: 'right', width: 100 });
    
    // Línea separadora
    yPos += 25;
    doc.moveTo(80, yPos).lineTo(530, yPos).stroke('#667eea');
    
    // Total
    yPos += 15;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#667eea');
    doc.text('TOTAL:', 80, yPos, { width: 350 });
    doc.text(`RD$ ${total.toFixed(2)}`, 430, yPos, { align: 'right', width: 100 });

    // Notas al pie
    if (orden.notas) {
      yPos += 50;
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
         .text('Notas:', 50, yPos)
         .text(orden.notas, 50, yPos + 15, { width: 512 });
    }

    // Pie de página
    doc.fontSize(8).fillColor('#999999')
       .text('Gracias por su preferencia', 50, 750, { align: 'center', width: 512 });
    doc.text('Sistema de Gestión de Combustible', 50, 765, { align: 'center', width: 512 });

    doc.end();
  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({ success: false, message: 'Error al generar factura' });
  }
});

module.exports = router;
