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
      
      // Control de modal
      showModal: false,
      modalType: '',
      modalTitle: '',
      modalIcon: '',
      
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
    }
  },
  
  methods: {
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
      this.activeSection = section;
      this.selectedItems = [];
      this.estadoFilter = 'todos';
      this.loadSectionData();
    },
    
    loadSectionData() {
      const sectionMap = {
        'clientes': 'cliente',
        'productos': 'producto',
        'almacenes': 'almacen',
        'choferes': 'delivery',
        'ordenes': 'orden',
        'usuarios': 'user'
      };
      this.loadData(sectionMap[this.activeSection]);
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
        
        const result = await this.apiRequest('GET', endpoint);
        if (result.success) {
          this[property] = result.data;
          
          // Cargar datos relacionados para órdenes
          if (module === 'orden') {
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
        almacen: { title: 'Almacén', icon: '🏭', form: { nombre: '', ubicacion: '', capacidad_total: '' }},
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
      this.openModal(type);
      
      // Copiar datos según el tipo
      if (type === 'orden') {
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
          telefono: item.telefono,
          direccion: item.direccion,
          role: item.role,
          password: '' // No pre-cargar password en edición
        };
      } else {
        this.currentForm = { ...item };
      }
    },
    
    // Guardar item
    async saveItem() {
      this.loading = true;
      try {
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
    }
  },
  
  mounted() {
    this.checkAuth();
    this.loadSectionData();
  }
}).mount('#app');
