const { createApp } = Vue;

const API_URL = 'http://localhost:3000/api';

createApp({
  data() {
    return {
      user: {},
      token: '',
      activeSection: 'clientes',
      
      // Datos de cada módulo
      clientes: [],
      productos: [],
      almacenes: [],
      deliveries: [],
      ordenes: [],
      usuarios: [],
      vehiculos: [],
      
      // Control de modal
      showModal: false,
      modalType: '',
      modalTitle: '',
      modalIcon: '',
      
      // Modal vehículos
      showVehiculosModal: false,
      vehiculoForm: {
        placa: '',
        marca: '',
        modelo: '',
        año: '',
        capacidad: ''
      },
      editingVehiculoId: null,
      
      // Formulario actual
      currentForm: {},
      
      // Modal inventario
      showInventarioModal: false,
      currentAlmacen: {},
      inventario: [],
      inventarioForm: {
        producto_id: '',
        cantidad: ''
      },
      
      // Estados
      loading: false,
      editingId: null,
      selectedItems: [],
      estadoFilter: 'todos',
      alert: { show: false, type: 'success', message: '' }
    };
  },
  
  computed: {
    filteredOrdenes() {
      if (this.estadoFilter === 'todos') {
        return this.ordenes;
      }
      return this.ordenes.filter(orden => (orden.estado || 'pendiente') === this.estadoFilter);
    },
    
    productosCompatibles() {
      if (!this.currentAlmacen || !this.currentAlmacen.unidad_capacidad) {
        return this.productos;
      }
      return this.productos.filter(p => p.unidad === this.currentAlmacen.unidad_capacidad);
    },
    
    deliveryCapacidad() {
      if (!this.currentForm.delivery_id) return 0;
      const chofer = this.deliveries.find(d => d.id == this.currentForm.delivery_id);
      return chofer && chofer.capacidad ? chofer.capacidad : 0;
    }
  },
  
  methods: {
    // Conversiones estándar
    GALON_A_LITROS: 3.78541,
    BARRIL_A_LITROS: 159,
    
    convertirALitros(cantidad, unidad) {
      switch(unidad) {
        case 'Litro':
          return cantidad;
        case 'Galón':
          return cantidad * this.GALON_A_LITROS;
        case 'Barril':
          return cantidad * this.BARRIL_A_LITROS;
        default:
          return cantidad;
      }
    },
    // Autenticación
    checkAuth() {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        window.location.href = 'login.html';
        return;
      }
      
      this.token = token;
      this.user = JSON.parse(user);
    },
    
    logout() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.replace('login.html');
    },
    
    // Navegación
    changeSection(section) {
      console.log('🔄 Cambiando a sección:', section);
      this.activeSection = section;
      this.selectedItems = [];
      this.estadoFilter = 'todos';
      this.loadSectionData(section);
      
      // Cargar vehículos si estamos en la sección de choferes
      if (section === 'choferes') {
        this.loadVehiculos();
      }
      
      console.log('✅ Sección activa:', this.activeSection);
    },
    
    loadSectionData(section = null) {
      const targetSection = section || this.activeSection;
      console.log('📊 loadSectionData llamado, sección objetivo:', targetSection);
      const sectionMap = {
        'clientes': 'cliente',
        'productos': 'producto',
        'almacenes': 'almacen',
        'choferes': 'delivery',
        'ordenes': 'orden',
        'usuarios': 'user'
      };
      const module = sectionMap[targetSection];
      console.log('📦 Módulo a cargar:', module);
      this.loadData(module);
    },
    
    // API Helper
    async apiRequest(method, endpoint, data = null) {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, options);
      return await response.json();
    },
    
    // Cargar datos
    async loadData(module) {
      console.log('🔍 loadData llamado con módulo:', module);
      this.loading = true;
      try {
        // Mapa de endpoints para casos especiales
        const endpointMap = {
          'almacen': '/almacenes',
          'orden': '/ordenes',
          'delivery': '/deliveries',
          'user': '/users'
        };
        const endpoint = endpointMap[module] || `/${module}s`;
        
        // Mapa de módulos a propiedades de data
        const propertyMap = {
          'almacen': 'almacenes',
          'orden': 'ordenes',
          'delivery': 'deliveries',
          'cliente': 'clientes',
          'producto': 'productos',
          'user': 'usuarios'
        };
        const property = propertyMap[module] || `${module}s`;
        
        console.log('🌐 Cargando desde endpoint:', endpoint);
        const result = await this.apiRequest('GET', endpoint);
        if (result.success) {
          this[property] = result.data;
          console.log('✔️ Datos cargados en propiedad:', property);
          
          // Cargar datos relacionados para órdenes
          if (module === 'orden') {
            console.log('📚 Cargando datos relacionados para órdenes');
            await this.loadRelatedData();
          }
        }
      } catch (error) {
        this.showAlert('error', 'Error al cargar datos');
      } finally {
        this.loading = false;
      }
    },
    
    // Cargar datos relacionados
    async loadRelatedData() {
      try {
        const [clientesRes, productosRes, almacenesRes, deliveriesRes] = await Promise.all([
          this.apiRequest('GET', '/clientes'),
          this.apiRequest('GET', '/productos'),
          this.apiRequest('GET', '/almacenes'),
          this.apiRequest('GET', '/deliveries')
        ]);
        
        if (clientesRes.success) this.clientes = clientesRes.data;
        if (productosRes.success) this.productos = productosRes.data;
        if (almacenesRes.success) this.almacenes = almacenesRes.data;
        if (deliveriesRes.success) this.deliveries = deliveriesRes.data;
      } catch (error) {
        console.error('Error cargando datos relacionados:', error);
      }
    },
    
    // Modal
    openModal(type) {
      this.modalType = type;
      this.editingId = null;
      
      const config = {
        cliente: { title: 'Cliente', icon: '👥', form: { nombre: '', direccion: '', cedula: '', telefono: '', email: '', condiciones_comerciales: '' }},
        producto: { title: 'Producto', icon: '⛽', form: { nombre: '', tipo: '', precio: '', unidad: '', descripcion: '' }},
        almacen: { title: 'Almacén', icon: '🏭', form: { nombre: '', ubicacion: '', capacidad_total: '', unidad_capacidad: '' }},
        chofer: { title: 'Chofer', icon: '🚗', form: { nombre: '', cedula: '', telefono: '', licencia: '', vehiculo_placa: '', vehiculo_capacidad: '' }},
        orden: { title: 'Orden', icon: '📋', form: { cliente_id: '', producto_id: '', delivery_id: '', almacen_id: '', volumen_solicitado: '', ubicacion_entrega: '', precio_unitario: '', notas: '' }},
        usuario: { title: 'Usuario', icon: '👤', form: { nombre: '', email: '', cedula: '', telefono: '', direccion: '', role: '', password: '' }}
      };
      
      const selected = config[type];
      this.modalTitle = selected.title;
      this.modalIcon = selected.icon;
      this.currentForm = { ...selected.form };
      
      // Cargar datos relacionados para órdenes
      if (type === 'orden' && this.clientes.length === 0) {
        this.loadRelatedData();
      }
      
      this.showModal = true;
    },
    
    closeModal() {
      this.showModal = false;
      this.editingId = null;
      this.currentForm = {};
    },
    
    // Editar item
    editItem(item, type) {
      this.editingId = item.id;
      this.modalType = type;
      
      // Establecer título e icono del modal
      const config = {
        cliente: { title: 'Cliente', icon: '👥' },
        producto: { title: 'Producto', icon: '⛽' },
        almacen: { title: 'Almacén', icon: '🏭' },
        chofer: { title: 'Chofer', icon: '🚗' },
        orden: { title: 'Orden', icon: '📋' },
        usuario: { title: 'Usuario', icon: '👤' }
      };
      
      const selected = config[type];
      this.modalTitle = selected.title;
      this.modalIcon = selected.icon;
      
      // Copiar datos según el tipo ANTES de abrir el modal
      if (type === 'cliente') {
        this.currentForm = {
          nombre: item.nombre,
          email: item.email,
          cedula: item.cedula,
          telefono: item.telefono || '',
          direccion: item.direccion || ''
        };
      } else if (type === 'chofer') {
        this.currentForm = {
          nombre: item.nombre,
          email: item.email,
          cedula: item.cedula,
          telefono: item.telefono || '',
          direccion: item.direccion || ''
        };
      } else if (type === 'orden') {
        this.currentForm = {
          cliente_id: item.cliente_id,
          producto_id: item.producto_id,
          delivery_id: item.delivery_id,
          almacen_id: item.almacen_id,
          volumen_solicitado: item.volumen_solicitado,
          ubicacion_entrega: item.ubicacion_entrega,
          precio_unitario: item.precio_unitario,
          notas: item.notas
        };
      } else if (type === 'usuario') {
        this.currentForm = {
          nombre: item.nombre,
          email: item.email,
          cedula: item.cedula,
          telefono: item.telefono || '',
          direccion: item.direccion || '',
          role: item.role,
          password: '' // No pre-cargar password en edición
        };
      } else {
        this.currentForm = { ...item };
      }
      
      // Cargar datos relacionados si es orden
      if (type === 'orden' && this.clientes.length === 0) {
        this.loadRelatedData();
      }
      
      // Abrir modal
      this.showModal = true;
    },
    
    // Guardar item
    async saveItem() {
      this.loading = true;
      try {
        // Validar capacidad del vehículo si es una orden
        if (this.modalType === 'orden') {
          const chofer = this.deliveries.find(d => d.id == this.currentForm.delivery_id);
          
          if (chofer && chofer.vehiculo_id) {
            const producto = this.productos.find(p => p.id == this.currentForm.producto_id);
            const volumenEnLitros = this.convertirALitros(
              parseFloat(this.currentForm.volumen_solicitado), 
              producto.unidad
            );
            
            if (volumenEnLitros > chofer.capacidad) {
              this.showAlert('error', 
                `⚠️ Capacidad insuficiente: El vehículo tiene ${chofer.capacidad}L pero la orden requiere ${volumenEnLitros.toFixed(2)}L`
              );
              this.loading = false;
              return;
            }
          } else if (chofer && !chofer.vehiculo_id) {
            this.showAlert('warning', '⚠️ El chofer seleccionado no tiene vehículo asignado');
            this.loading = false;
            return;
          }
        }
        
        const typeMap = {
          cliente: 'clientes',
          producto: 'productos',
          almacen: 'almacenes',
          chofer: 'deliveries',
          orden: 'ordenes',
          usuario: 'users'
        };
        
        const endpoint = typeMap[this.modalType];
        const method = this.editingId ? 'PUT' : 'POST';
        const url = this.editingId ? `/${endpoint}/${this.editingId}` : `/${endpoint}`;
        
        // Si es usuario y está editando sin cambiar password, remover del payload
        let payload = { ...this.currentForm };
        if (this.modalType === 'usuario' && this.editingId && !payload.password) {
          delete payload.password;
        }
        
        const result = await this.apiRequest(method, url, payload);
        
        if (result.success) {
          this.showAlert('success', result.message);
          this.closeModal();
          this.loadSectionData();
        } else {
          this.showAlert('error', result.message);
        }
      } catch (error) {
        this.showAlert('error', 'Error al guardar');
      } finally {
        this.loading = false;
      }
    },
    
    // Eliminar item individual
    async deleteItem(id, module) {
      if (!confirm('¿Estás seguro de eliminar este registro?')) return;
      
      try {
        const result = await this.apiRequest('DELETE', `/${module}/${id}`);
        if (result.success) {
          this.showAlert('success', result.message);
          this.loadSectionData();
        } else {
          this.showAlert('error', result.message);
        }
      } catch (error) {
        this.showAlert('error', 'Error al eliminar');
      }
    },
    
    // Eliminar seleccionados
    async deleteSelected(module) {
      if (this.selectedItems.length === 0) return;
      
      if (!confirm(`¿Eliminar ${this.selectedItems.length} registro(s)?`)) return;
      
      try {
        const deletePromises = this.selectedItems.map(id => 
          this.apiRequest('DELETE', `/${module}/${id}`)
        );
        
        await Promise.all(deletePromises);
        
        this.showAlert('success', `${this.selectedItems.length} registro(s) eliminado(s)`);
        this.selectedItems = [];
        this.loadSectionData();
      } catch (error) {
        this.showAlert('error', 'Error al eliminar registros');
      }
    },
    
    // Selección
    toggleSelectAll(module) {
      const dataMap = {
        clientes: this.clientes,
        productos: this.productos,
        almacenes: this.almacenes,
        deliveries: this.deliveries,
        ordenes: this.filteredOrdenes,
        usuarios: this.usuarios
      };
      
      const items = dataMap[module];
      
      if (this.selectedItems.length === items.length) {
        this.selectedItems = [];
      } else {
        this.selectedItems = items.map(item => item.id);
      }
    },
    
    allSelected(module) {
      const dataMap = {
        clientes: this.clientes,
        productos: this.productos,
        almacenes: this.almacenes,
        deliveries: this.deliveries,
        ordenes: this.filteredOrdenes,
        usuarios: this.usuarios
      };
      
      const items = dataMap[module];
      return items.length > 0 && this.selectedItems.length === items.length;
    },
    
    // Badge de estado
    getBadgeClass(estado) {
      const estadoNorm = (estado || 'pendiente').toLowerCase();
      const classMap = {
        'pendiente': 'badge-warning',
        'en tránsito': 'badge-info',
        'entregado': 'badge-success'
      };
      return classMap[estadoNorm] || 'badge-warning';
    },
    
    // Badge de rol
    getRoleBadgeClass(role) {
      const classMap = {
        'admin': 'badge-danger',
        'empleado': 'badge-info',
        'transportista': 'badge-warning',
        'cliente': 'badge-success'
      };
      return classMap[role] || 'badge-info';
    },
    
    // Helpers
    showAlert(type, message) {
      this.alert = { show: true, type, message };
      setTimeout(() => {
        this.alert.show = false;
      }, 5000);
    },
    
    formatCedulaModal(event) {
      let value = event.target.value.replace(/\D/g, '');
      if (value.length >= 3) value = value.slice(0, 3) + '-' + value.slice(3);
      if (value.length >= 11) value = value.slice(0, 11) + '-' + value.slice(11, 12);
      this.currentForm.cedula = value;
    },
    
    formatTelefonoModal(event) {
      let value = event.target.value.replace(/\D/g, '');
      if (value.length >= 3) value = value.slice(0, 3) + '-' + value.slice(3);
      if (value.length >= 7) value = value.slice(0, 7) + '-' + value.slice(7, 11);
      this.currentForm.telefono = value;
    },
    
    // Métodos para gestión de inventario
    async openInventarioModal(almacen) {
      this.currentAlmacen = almacen;
      this.showInventarioModal = true;
      this.inventarioForm = { producto_id: '', cantidad: '' };
      await this.loadInventarioData(almacen.id);
      
      // Cargar productos si no están cargados
      if (this.productos.length === 0) {
        const result = await this.apiRequest('GET', '/productos');
        if (result.success) {
          this.productos = result.data;
        }
      }
    },
    
    closeInventarioModal() {
      this.showInventarioModal = false;
      this.currentAlmacen = {};
      this.inventario = [];
      this.inventarioForm = { producto_id: '', cantidad: '' };
    },
    
    async loadInventarioData(almacenId) {
      this.loading = true;
      try {
        const result = await this.apiRequest('GET', `/inventario/almacen/${almacenId}`);
        if (result.success) {
          this.inventario = result.data;
        }
      } catch (error) {
        console.error('Error al cargar inventario:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async addProductoToInventario() {
      if (!this.inventarioForm.producto_id || !this.inventarioForm.cantidad) {
        alert('Por favor completa todos los campos');
        return;
      }
      
      // Validar que el producto tenga la misma unidad que el almacén
      const producto = this.productos.find(p => p.id == this.inventarioForm.producto_id);
      if (producto && producto.unidad !== this.currentAlmacen.unidad_capacidad) {
        alert(`Este almacén solo acepta productos en ${this.currentAlmacen.unidad_capacidad}. El producto seleccionado usa ${producto.unidad}.`);
        return;
      }
      
      this.loading = true;
      try {
        const result = await this.apiRequest('POST', '/inventario', {
          almacen_id: this.currentAlmacen.id,
          producto_id: parseInt(this.inventarioForm.producto_id),
          cantidad: parseFloat(this.inventarioForm.cantidad)
        });
        
        if (result.success) {
          this.showAlert('success', 'Producto agregado exitosamente');
          this.inventarioForm = { producto_id: '', cantidad: '' };
          
          // Recargar inventario y almacenes
          await this.loadInventarioData(this.currentAlmacen.id);
          await this.loadData('almacen');
          
          // Actualizar almacén actual
          const almacenUpdated = this.almacenes.find(a => a.id === this.currentAlmacen.id);
          if (almacenUpdated) {
            this.currentAlmacen = almacenUpdated;
          }
        } else {
          alert(result.message || 'Error al agregar producto');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al agregar producto');
      } finally {
        this.loading = false;
      }
    },
    
    async deleteInventarioItem(id) {
      if (!confirm('¿Eliminar este producto del inventario?')) return;
      
      this.loading = true;
      try {
        const result = await this.apiRequest('DELETE', `/inventario/${id}`);
        if (result.success) {
          this.showAlert('success', 'Producto eliminado del inventario');
          
          // Recargar inventario y almacenes
          await this.loadInventarioData(this.currentAlmacen.id);
          await this.loadData('almacen');
          
          // Actualizar almacén actual
          const almacenUpdated = this.almacenes.find(a => a.id === this.currentAlmacen.id);
          if (almacenUpdated) {
            this.currentAlmacen = almacenUpdated;
          }
        } else {
          alert(result.message || 'Error al eliminar producto');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar producto');
      } finally {
        this.loading = false;
      }
    },
    
    // Generar reporte PDF
    async generateReport(tipo) {
      try {
        const response = await fetch(`${API_URL}/reportes/${tipo}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reporte_${tipo}_${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.showAlert('success', 'Reporte generado exitosamente');
        } else {
          const error = await response.json();
          this.showAlert('error', error.message || 'Error al generar reporte');
        }
      } catch (error) {
        console.error('Error generando reporte:', error);
        this.showAlert('error', 'Error al generar reporte');
      }
    },

    // Gestión de Vehículos
    async openVehiculosModal() {
      await this.loadVehiculos();
      this.showVehiculosModal = true;
    },

    closeVehiculosModal() {
      this.showVehiculosModal = false;
      this.resetVehiculoForm();
    },

    resetVehiculoForm() {
      this.vehiculoForm = {
        placa: '',
        marca: '',
        modelo: '',
        año: '',
        capacidad: ''
      };
      this.editingVehiculoId = null;
    },

    async loadVehiculos() {
      try {
        const response = await fetch(`${API_URL}/vehiculos`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.ok) {
          this.vehiculos = await response.json();
        }
      } catch (error) {
        console.error('Error cargando vehículos:', error);
      }
    },

    editVehiculo(vehiculo) {
      this.vehiculoForm = {
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        año: vehiculo.año || '',
        capacidad: vehiculo.capacidad
      };
      this.editingVehiculoId = vehiculo.id;
    },

    async saveVehiculo() {
      try {
        const url = this.editingVehiculoId 
          ? `${API_URL}/vehiculos/${this.editingVehiculoId}`
          : `${API_URL}/vehiculos`;
        
        const method = this.editingVehiculoId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(this.vehiculoForm)
        });

        if (response.ok) {
          this.showAlert('success', this.editingVehiculoId ? 'Vehículo actualizado' : 'Vehículo creado');
          await this.loadVehiculos();
          this.resetVehiculoForm();
        } else {
          const error = await response.json();
          this.showAlert('error', error.error || 'Error al guardar vehículo');
        }
      } catch (error) {
        console.error('Error guardando vehículo:', error);
        this.showAlert('error', 'Error al guardar vehículo');
      }
    },

    async deleteVehiculo(id) {
      if (!confirm('¿Estás seguro de eliminar este vehículo?')) return;
      
      try {
        const response = await fetch(`${API_URL}/vehiculos/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.ok) {
          this.showAlert('success', 'Vehículo eliminado');
          await this.loadVehiculos();
        } else {
          const error = await response.json();
          this.showAlert('error', error.error || 'Error al eliminar vehículo');
        }
      } catch (error) {
        console.error('Error eliminando vehículo:', error);
        this.showAlert('error', 'Error al eliminar vehículo');
      }
    },

    async asignarVehiculo(choferId, vehiculoId) {
      try {
        const response = await fetch(`${API_URL}/deliveries/${choferId}/asignar-vehiculo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ vehiculo_id: vehiculoId || null })
        });

        if (response.ok) {
          this.showAlert('success', 'Vehículo asignado exitosamente');
          await this.loadSectionData('choferes');
        } else {
          const error = await response.json();
          this.showAlert('error', error.message || 'Error al asignar vehículo');
        }
      } catch (error) {
        console.error('Error asignando vehículo:', error);
        this.showAlert('error', 'Error al asignar vehículo');
      }
    },

    async asignarChoferOrden(ordenId, choferId, volumenOrden) {
      if (!choferId) {
        // Si se deselecciona el chofer, solo actualizar la UI
        this.showAlert('info', 'Chofer desasignado');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/ordenes/${ordenId}/asignar-chofer`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ delivery_id: choferId })
        });

        const result = await response.json();

        if (result.success) {
          this.showAlert('success', `Chofer asignado: ${result.data.chofer_nombre} (${result.data.capacidad}L)`);
          await this.loadSectionData('ordenes');
        } else {
          this.showAlert('error', result.message || 'Error al asignar chofer');
          // Recargar para revertir el cambio visual
          await this.loadSectionData('ordenes');
        }
      } catch (error) {
        console.error('Error asignando chofer:', error);
        this.showAlert('error', 'Error al asignar chofer');
        await this.loadSectionData('ordenes');
      }
    },

    async togglePagoOrden(ordenId, pagado) {
      try {
        const response = await fetch(`${API_URL}/ordenes/${ordenId}/pago`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ pagado })
        });

        const result = await response.json();

        if (result.success) {
          this.showAlert('success', result.message);
          await this.loadSectionData('ordenes');
        } else {
          this.showAlert('error', result.message || 'Error al actualizar estado de pago');
          await this.loadSectionData('ordenes');
        }
      } catch (error) {
        console.error('Error actualizando pago:', error);
        this.showAlert('error', 'Error al actualizar estado de pago');
        await this.loadSectionData('ordenes');
      }
    }
  },
  
  mounted() {
    console.log('🚀 App montada, sección inicial:', this.activeSection);
    this.checkAuth();
    this.loadSectionData();
  }
}).mount('#app');
