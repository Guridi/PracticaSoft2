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

// Función helper para crear header consistente en todos los reportes
function createReportHeader(doc, titulo, subtitulo = null) {
  // Header - Título principal con fondo morado
  doc.rect(50, 50, 512, 80).fill('#667eea');
  doc.fontSize(24).fillColor('#FFFFFF').font('Helvetica-Bold')
     .text(titulo, 50, 70, { align: 'center', width: 512 });
  
  if (subtitulo) {
    doc.fontSize(12).font('Helvetica')
       .text(subtitulo, 50, 100, { align: 'center', width: 512 });
  }
  
  // Fecha de emisión
  doc.fontSize(10)
     .text(`Fecha de Emisión: ${formatDate(new Date())}`, 50, 120, { align: 'right', width: 512 });
  
  return 160; // Retorna la posición Y donde continuar
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

    // Header consistente
    let yPos = createReportHeader(doc, 'REPORTE DE CLIENTES', `Total: ${clientes.length} registros`);

    // Información del reporte
    yPos += 20;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').fillColor('#667eea')
       .text('Información del Reporte', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`Generado por: ${req.user.nombre}`, 50, yPos)
       .text(`Total de registros: ${clientes.length}`, 50, yPos + 15)
       .text(`Fecha: ${formatDate(new Date())}`, 50, yPos + 30);

    // Tabla
    yPos += 70;
    const tableTop = yPos;
    const itemHeight = 25;
    
    // Encabezado de tabla con estilo
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, tableTop, 512, 25).fill('#667eea');
    doc.text('ID', 60, tableTop + 8, { width: 30 });
    doc.text('Nombre', 100, tableTop + 8, { width: 140 });
    doc.text('Cédula', 250, tableTop + 8, { width: 90 });
    doc.text('Teléfono', 350, tableTop + 8, { width: 90 });
    doc.text('Email', 450, tableTop + 8, { width: 100 });

    // Filas con alternancia de color
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    clientes.forEach((cliente, i) => {
      const y = tableTop + 25 + (i * itemHeight);
      if (y > 750) return; // Evitar desbordamiento de página
      
      if (i % 2 === 1) {
        doc.rect(50, y, 512, itemHeight).fill('#f7fafc');
      }
      
      doc.fillColor('#000000')
         .text(cliente.id, 60, y + 8, { width: 30 })
         .text(cliente.nombre || '-', 100, y + 8, { width: 140 })
         .text(cliente.cedula || '-', 250, y + 8, { width: 90 })
         .text(cliente.telefono || '-', 350, y + 8, { width: 90 })
         .text(cliente.email || '-', 450, y + 8, { width: 100 });
    });
    
    // Borde de tabla
    const tableHeight = Math.min(clientes.length * itemHeight + 25, 750 - tableTop);
    doc.rect(50, tableTop, 512, tableHeight).stroke('#e2e8f0');

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

    // Header consistente
    let yPos = createReportHeader(doc, 'REPORTE DE EMPLEADOS', `Total: ${empleados.length} registros`);

    // Información del reporte
    yPos += 20;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').fillColor('#667eea')
       .text('Información del Reporte', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`Generado por: ${req.user.nombre}`, 50, yPos)
       .text(`Total de registros: ${empleados.length}`, 50, yPos + 15)
       .text(`Fecha: ${formatDate(new Date())}`, 50, yPos + 30);

    // Tabla
    yPos += 70;
    const tableTop = yPos;
    const itemHeight = 25;
    
    // Encabezado de tabla con estilo
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, tableTop, 512, 25).fill('#667eea');
    doc.text('ID', 60, tableTop + 8, { width: 30 });
    doc.text('Nombre', 100, tableTop + 8, { width: 140 });
    doc.text('Cédula', 250, tableTop + 8, { width: 90 });
    doc.text('Teléfono', 350, tableTop + 8, { width: 90 });
    doc.text('Email', 450, tableTop + 8, { width: 100 });

    // Filas con alternancia de color
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    empleados.forEach((empleado, i) => {
      const y = tableTop + 25 + (i * itemHeight);
      if (y > 750) return;
      
      if (i % 2 === 1) {
        doc.rect(50, y, 512, itemHeight).fill('#f7fafc');
      }
      
      doc.fillColor('#000000')
         .text(empleado.id, 60, y + 8, { width: 30 })
         .text(empleado.nombre || '-', 100, y + 8, { width: 140 })
         .text(empleado.cedula || '-', 250, y + 8, { width: 90 })
         .text(empleado.telefono || '-', 350, y + 8, { width: 90 })
         .text(empleado.email || '-', 450, y + 8, { width: 100 });
    });
    
    // Borde de tabla
    const tableHeight = Math.min(empleados.length * itemHeight + 25, 750 - tableTop);
    doc.rect(50, tableTop, 512, tableHeight).stroke('#e2e8f0');

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

    // Header consistente
    let yPos = createReportHeader(doc, 'REPORTE DE PRODUCTOS', `Total: ${productos.length} registros`);

    // Información del reporte
    yPos += 20;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').fillColor('#667eea')
       .text('Información del Reporte', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`Generado por: ${req.user.nombre}`, 50, yPos)
       .text(`Total de registros: ${productos.length}`, 50, yPos + 15)
       .text(`Fecha: ${formatDate(new Date())}`, 50, yPos + 30);

    // Tabla
    yPos += 70;
    const tableTop = yPos;
    const itemHeight = 25;
    
    // Encabezado de tabla con estilo
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, tableTop, 512, 25).fill('#667eea');
    doc.text('ID', 60, tableTop + 8, { width: 30 });
    doc.text('Nombre', 100, tableTop + 8, { width: 140 });
    doc.text('Tipo', 250, tableTop + 8, { width: 90 });
    doc.text('Precio', 350, tableTop + 8, { width: 70 });
    doc.text('Unidad', 430, tableTop + 8, { width: 122 });

    // Filas con alternancia de color
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    productos.forEach((producto, i) => {
      const y = tableTop + 25 + (i * itemHeight);
      if (y > 750) return;
      
      if (i % 2 === 1) {
        doc.rect(50, y, 512, itemHeight).fill('#f7fafc');
      }
      
      doc.fillColor('#000000')
         .text(producto.id, 60, y + 8, { width: 30 })
         .text(producto.nombre || '-', 100, y + 8, { width: 140 })
         .text(producto.tipo || '-', 250, y + 8, { width: 90 })
         .text(`RD$ ${parseFloat(producto.precio || 0).toFixed(2)}`, 350, y + 8, { width: 70 })
         .text(producto.unidad || '-', 430, y + 8, { width: 122 });
    });
    
    // Borde de tabla
    const tableHeight = Math.min(productos.length * itemHeight + 25, 750 - tableTop);
    doc.rect(50, tableTop, 512, tableHeight).stroke('#e2e8f0');

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

    // Header consistente
    let yPos = createReportHeader(doc, 'REPORTE DE ALMACENES', `Total: ${almacenes.length} registros`);

    // Información del reporte
    yPos += 20;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').fillColor('#667eea')
       .text('Información del Reporte', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`Generado por: ${req.user.nombre}`, 50, yPos)
       .text(`Total de registros: ${almacenes.length}`, 50, yPos + 15)
       .text(`Fecha: ${formatDate(new Date())}`, 50, yPos + 30);

    // Tabla
    yPos += 70;
    const tableTop = yPos;;
    const itemHeight = 25;
    
    // Encabezado de tabla con estilo
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, tableTop, 512, 25).fill('#667eea');
    doc.text('ID', 60, tableTop + 8, { width: 30 });
    doc.text('Nombre', 100, tableTop + 8, { width: 140 });
    doc.text('Ubicación', 250, tableTop + 8, { width: 120 });
    doc.text('Capacidad Total', 380, tableTop + 8, { width: 172 });

    // Filas con alternancia de color
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    almacenes.forEach((almacen, i) => {
      const y = tableTop + 25 + (i * itemHeight);
      if (y > 750) return;
      
      if (i % 2 === 1) {
        doc.rect(50, y, 512, itemHeight).fill('#f7fafc');
      }
      
      doc.fillColor('#000000')
         .text(almacen.id, 60, y + 8, { width: 30 })
         .text(almacen.nombre || '-', 100, y + 8, { width: 140 })
         .text(almacen.ubicacion || '-', 250, y + 8, { width: 120 })
         .text(`${parseFloat(almacen.capacidad_total || 0).toFixed(2)} ${almacen.unidad_capacidad || 'L'}`, 380, y + 8, { width: 172 });
    });
    
    // Borde de tabla
    const tableHeight = Math.min(almacenes.length * itemHeight + 25, 750 - tableTop);
    doc.rect(50, tableTop, 512, tableHeight).stroke('#e2e8f0');

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

    // Header consistente
    let yPos = createReportHeader(doc, 'REPORTE DE CHOFERES', `Total: ${choferes.length} registros`);

    // Información del reporte
    yPos += 20;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').fillColor('#667eea')
       .text('Información del Reporte', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`Generado por: ${req.user.nombre}`, 50, yPos)
       .text(`Total de registros: ${choferes.length}`, 50, yPos + 15)
       .text(`Fecha: ${formatDate(new Date())}`, 50, yPos + 30);

    // Tabla
    yPos += 70;
    const tableTop = yPos;
    const itemHeight = 25;
    
    // Encabezado de tabla con estilo
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, tableTop, 512, 25).fill('#667eea');
    doc.text('ID', 60, tableTop + 8, { width: 30 });
    doc.text('Nombre', 100, tableTop + 8, { width: 120 });
    doc.text('Cédula', 230, tableTop + 8, { width: 90 });
    doc.text('Licencia', 330, tableTop + 8, { width: 90 });
    doc.text('Placa', 430, tableTop + 8, { width: 122 });

    // Filas con alternancia de color
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    choferes.forEach((chofer, i) => {
      const y = tableTop + 25 + (i * itemHeight);
      if (y > 750) return;
      
      if (i % 2 === 1) {
        doc.rect(50, y, 512, itemHeight).fill('#f7fafc');
      }
      
      doc.fillColor('#000000')
         .text(chofer.id, 60, y + 8, { width: 30 })
         .text(chofer.nombre || '-', 100, y + 8, { width: 120 })
         .text(chofer.cedula || '-', 230, y + 8, { width: 90 })
         .text(chofer.licencia || '-', 330, y + 8, { width: 90 })
         .text(chofer.vehiculo_placa || '-', 430, y + 8, { width: 122 });
    });
    
    // Borde de tabla
    const tableHeight = Math.min(choferes.length * itemHeight + 25, 750 - tableTop);
    doc.rect(50, tableTop, 512, tableHeight).stroke('#e2e8f0');

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

    // Header consistente
    let yPos = createReportHeader(doc, 'REPORTE DE ÓRDENES', `Total: ${ordenes.length} registros`);

    // Información del reporte
    yPos += 20;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').fillColor('#667eea')
       .text('Información del Reporte', 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`Generado por: ${req.user.nombre}`, 50, yPos)
       .text(`Total de registros: ${ordenes.length}`, 50, yPos + 15)
       .text(`Fecha: ${formatDate(new Date())}`, 50, yPos + 30);

    // Tabla
    yPos += 70;
    const tableTop = yPos;
    const itemHeight = 30;
    
    // Encabezado de tabla con estilo
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, tableTop, 512, 25).fill('#667eea');
    doc.text('ID', 60, tableTop + 8, { width: 30 });
    doc.text('Producto', 100, tableTop + 8, { width: 110 });
    doc.text('Volumen', 220, tableTop + 8, { width: 60 });
    doc.text('Dirección', 290, tableTop + 8, { width: 262 });

    // Filas con alternancia de color
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    ordenes.forEach((orden, i) => {
      const y = tableTop + 25 + (i * itemHeight);
      if (y > 750) return;
      
      if (i % 2 === 1) {
        doc.rect(50, y, 512, itemHeight).fill('#f7fafc');
      }
      
      doc.fillColor('#000000')
         .text(orden.id, 60, y + 8, { width: 30 })
         .text(orden.producto_nombre || '-', 100, y + 8, { width: 110 })
         .text(`${parseFloat(orden.volumen_solicitado || 0).toFixed(2)}`, 220, y + 8, { width: 60 })
         .text(orden.ubicacion_entrega || '-', 290, y + 8, { width: 262 });
    });
    
    // Borde de tabla
    const tableHeight = Math.min(ordenes.length * itemHeight + 25, 750 - tableTop);
    doc.rect(50, tableTop, 512, tableHeight).stroke('#e2e8f0');

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

    // Detalles de la orden - TABLA
    yPos += 90;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#667eea')
       .text('Detalles de la Orden', 50, yPos);

    yPos += 30;
    // Encabezado de tabla
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.rect(50, yPos, 512, 25).fill('#667eea');
    doc.text('Campo', 60, yPos + 8, { width: 200 });
    doc.text('Información', 270, yPos + 8, { width: 282 });
    
    yPos += 25;
    // Filas de la tabla
    const detalles = [
      ['Producto', `${orden.producto_nombre} (${orden.producto_tipo})`],
      ['Cantidad', `${orden.volumen_solicitado.toFixed(2)} ${orden.producto_unidad}(s)`],
      ['Ubicación de Entrega', orden.ubicacion_entrega],
      ['Almacén', `${orden.almacen_nombre} - ${orden.almacen_ubicacion || ''}`],
      ['Chofer', orden.chofer_nombre || 'No asignado'],
      ['Método de Pago', orden.payment_method || 'No especificado'],
      ['Estado', orden.estado],
      ['Pagado', orden.pagado ? 'Sí' : 'No']
    ];
    
    doc.fontSize(9).font('Helvetica').fillColor('#000000');
    let alternate = false;
    detalles.forEach(([campo, valor]) => {
      if (alternate) {
        doc.rect(50, yPos, 512, 20).fill('#f7fafc');
      }
      doc.fillColor('#000000')
         .font('Helvetica-Bold').text(campo, 60, yPos + 6, { width: 200 })
         .font('Helvetica').text(valor, 270, yPos + 6, { width: 282 });
      yPos += 20;
      alternate = !alternate;
    });
    doc.rect(50, yPos - 160, 512, 160).stroke('#e2e8f0');

    // Desglose de costos
    yPos += 10;
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
