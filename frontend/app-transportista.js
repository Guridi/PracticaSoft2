const { createApp } = Vue;

const API_URL = 'http://localhost:3000/api';

createApp({
  data() {
    return {
      user: {},
      token: '',
      ordenes: [],
      loading: false,
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
      
      // Verificar que el usuario sea transportista
      if (this.user.role !== 'transportista') {
        this.showAlert('error', 'Acceso denegado. Solo para transportistas.');
        setTimeout(() => {
          this.logout();
        }, 2000);
      }
    },
    
    logout() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.replace('login.html');
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
      
      try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok && response.status === 401) {
          this.showAlert('error', 'Sesión expirada');
          setTimeout(() => this.logout(), 1500);
          return null;
        }
        
        return result;
      } catch (error) {
        console.error('Error en API request:', error);
        throw error;
      }
    },
    
    // Cargar órdenes asignadas al transportista
    async loadOrders() {
      this.loading = true;
      try {
        const result = await this.apiRequest('GET', '/ordenes');
        
        if (result && result.success) {
          // Filtrar órdenes asignadas a este transportista
          // Asumimos que delivery_id corresponde al user.id del transportista
          this.ordenes = result.data.filter(orden => {
            return orden.delivery_id === this.user.id;
          });
        } else {
          this.showAlert('error', result?.message || 'Error al cargar órdenes');
        }
      } catch (error) {
        this.showAlert('error', 'Error al cargar órdenes');
        console.error('Error:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // Actualizar estado de la orden
    async updateOrderStatus(orderId, newStatus) {
      if (this.loading) return;
      
      const confirmMessage = newStatus === 'en tránsito' 
        ? '¿Iniciar la entrega de esta orden?' 
        : '¿Confirmar que la entrega se completó?';
      
      if (!confirm(confirmMessage)) return;
      
      this.loading = true;
      try {
        // Obtener la orden actual
        const orden = this.ordenes.find(o => o.id === orderId);
        if (!orden) {
          this.showAlert('error', 'Orden no encontrada');
          return;
        }
        
        // Preparar datos para actualizar
        const updateData = {
          user_id: orden.user_id,
          producto_id: orden.producto_id,
          delivery_id: orden.delivery_id,
          almacen_id: orden.almacen_id,
          volumen_solicitado: orden.volumen_solicitado,
          volumen_entregado: newStatus === 'entregado' ? orden.volumen_solicitado : orden.volumen_entregado,
          estado: newStatus,
          ubicacion_entrega: orden.ubicacion_entrega,
          fecha_entrega: newStatus === 'entregado' ? new Date().toISOString() : orden.fecha_entrega,
          precio_unitario: orden.precio_unitario,
          notas: orden.notas
        };
        
        const result = await this.apiRequest('PUT', `/ordenes/${orderId}`, updateData);
        
        if (result && result.success) {
          this.showAlert('success', result.message || 'Estado actualizado correctamente');
          await this.loadOrders(); // Recargar órdenes
        } else {
          this.showAlert('error', result?.message || 'Error al actualizar estado');
        }
      } catch (error) {
        this.showAlert('error', 'Error al actualizar estado');
        console.error('Error:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // Verificar si se puede iniciar la entrega
    canIniciar(orden) {
      const estado = (orden.estado || 'pendiente').toLowerCase();
      return estado === 'pendiente';
    },
    
    // Verificar si se puede completar la entrega
    canCompletar(orden) {
      const estado = (orden.estado || 'pendiente').toLowerCase();
      return estado === 'en tránsito';
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
    
    // Formatear fecha
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    // Mostrar alerta
    showAlert(type, message) {
      this.alert = { show: true, type, message };
      setTimeout(() => {
        this.alert.show = false;
      }, 5000);
    }
  },
  
  mounted() {
    this.checkAuth();
    this.loadOrders();
  }
}).mount('#app');
