document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let currentPage = 1;
    let totalPages = 1;
    let registrosChart, tiposChart;
  
    // Elementos del DOM
    const postulantesSection = document.getElementById('postulantes-section');
    const estadisticasSection = document.getElementById('estadisticas-section');
    const tablaPostulantes = document.getElementById('tabla-postulantes');
    const paginacion = document.getElementById('paginacion');
    const buscarPostulante = document.getElementById('buscar-postulante');
    const btnExportar = document.getElementById('btn-exportar');
    const requisitosStats = document.getElementById('requisitos-stats');
  
    // Tabs
    document.getElementById('tab-postulantes').addEventListener('click', (e) => {
      e.preventDefault();
      postulantesSection.style.display = 'block';
      estadisticasSection.style.display = 'none';
      cargarPostulantes();
    });
  
    document.getElementById('tab-estadisticas').addEventListener('click', (e) => {
      e.preventDefault();
      postulantesSection.style.display = 'none';
      estadisticasSection.style.display = 'block';
      cargarEstadisticas();
    });
  
    // Buscador
    buscarPostulante.addEventListener('input', () => {
      currentPage = 1;
      cargarPostulantes();
    });
  
    // Botón exportar
    btnExportar.addEventListener('click', () => {
      window.location.href = '/admin/postulantes/excel';
    });
  
    // Cargar postulantes
    async function cargarPostulantes() {
      const search = buscarPostulante.value;
      try {
        const response = await fetch(`/admin/postulantes?page=${currentPage}&search=${encodeURIComponent(search)}`);
        const data = await response.json();
  
        if (data.success) {
          // Actualizar tabla
          tablaPostulantes.innerHTML = data.data.map(postulante => `
            <tr>
              <td>${postulante.id}</td>
              <td>${postulante.nombre} ${postulante.apellido_paterno} ${postulante.apellido_materno}</td>
              <td>${postulante.cedula_identidad} ${postulante.complemento || ''} ${postulante.expedicion || ''}</td>
              <td>${postulante.tipo_postulacion}</td>
              <td>${new Date(postulante.fecha_registro).toLocaleString()}</td>
            </tr>
          `).join('');
  
          // Actualizar paginación
          totalPages = data.totalPages;
          actualizarPaginacion();
        }
      } catch (error) {
        console.error('Error al cargar postulantes:', error);
      }
    }
  
    // Actualizar paginación
    function actualizarPaginacion() {
      paginacion.innerHTML = '';
  
      // Botón Anterior
      const liPrev = document.createElement('li');
      liPrev.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
      liPrev.innerHTML = `<a class="page-link" href="#">Anterior</a>`;
      liPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
          currentPage--;
          cargarPostulantes();
        }
      });
      paginacion.appendChild(liPrev);
  
      // Números de página
      for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
          e.preventDefault();
          currentPage = i;
          cargarPostulantes();
        });
        paginacion.appendChild(li);
      }
  
      // Botón Siguiente
      const liNext = document.createElement('li');
      liNext.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
      liNext.innerHTML = `<a class="page-link" href="#">Siguiente</a>`;
      liNext.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
          currentPage++;
          cargarPostulantes();
        }
      });
      paginacion.appendChild(liNext);
    }
  
    // Cargar estadísticas
    async function cargarEstadisticas() {
      try {
        const response = await fetch('/admin/estadisticas');
        const data = await response.json();
  
        if (data.success) {
          // Gráfico de registros por minuto
          const ctxRegistros = document.getElementById('chart-registros').getContext('2d');
          if (registrosChart) registrosChart.destroy();
          
          registrosChart = new Chart(ctxRegistros, {
            type: 'line',
            data: {
              labels: data.data.registrosPorMinuto.map(item => new Date(item.minuto).toLocaleTimeString()),
              datasets: [{
                label: 'Registros por minuto',
                data: data.data.registrosPorMinuto.map(item => item.cantidad),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
              }]
            }
          });
  
          // Gráfico de tipos de postulación
          const ctxTipos = document.getElementById('chart-tipos').getContext('2d');
          if (tiposChart) tiposChart.destroy();
          
          tiposChart = new Chart(ctxTipos, {
            type: 'doughnut',
            data: {
              labels: data.data.totalesPorTipo.map(item => item.tipo_postulacion),
              datasets: [{
                data: data.data.totalesPorTipo.map(item => item.total),
                backgroundColor: [
                  'rgb(54, 162, 235)',
                  'rgb(255, 99, 132)'
                ]
              }]
            }
          });
  
          // Estadísticas de requisitos
          const stats = data.data.cumplimientoRequisitos;
          const total = stats.total;
          
          requisitosStats.innerHTML = `
            <div class="col-md-4 mb-3">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Es boliviano</h5>
                  <p class="card-text">${stats.es_boliviano} (${Math.round((stats.es_boliviano / total) * 100)}%)</p>
                </div>
              </div>
            </div>
            <div class="col-md-4 mb-3">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Registrado en padrón</h5>
                  <p class="card-text">${stats.registrado_padron} (${Math.round((stats.registrado_padron / total) * 100)}%)</p>
                </div>
              </div>
            </div>
            <!-- Agregar más requisitos según sea necesario -->
          `;
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    }
  
    // Cargar postulantes al inicio
    cargarPostulantes();
  });