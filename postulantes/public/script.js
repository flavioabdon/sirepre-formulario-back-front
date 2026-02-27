document.addEventListener('DOMContentLoaded', () => {
    const verificarForm = document.getElementById('verificarForm');
    const registroForm = document.getElementById('registroForm');
    const mensaje = document.getElementById('mensaje');
    const toastContainer = document.querySelector('.toast-container');
    
    function showToast(message, type = 'info') {
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toastEl);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }

   const archivoInputs = ['archivo_ci', 'archivo_curriculum'];

    archivoInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', function (e) {
                const file = this.files[0];

                if (!file) return;

                const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                const isUnder1MB = file.size <= 1024 * 1024;

                if (!isPDF) {
                    showToast('Solo se permiten archivos en formato PDF.', 'danger');
                    this.value = '';
                    return;
                }

                if (!isUnder1MB) {
                    showToast('El archivo supera el tamaño máximo de 1MB.', 'warning');
                    this.value = '';
                    return;
                }

                showToast('Archivo válido cargado.', 'success');
            });
        }
    });

    const archivoInputsImg = ['archivo_no_militancia', 'archivo_certificado_ofimatica']; 

    archivoInputsImg.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', function (e) {
                const file = this.files[0];

                if (!file) return;

                const isIMG = /\.(jpg|jpeg|png)$/i.test(file.name);
                const isUnder1MB = file.size <= 1024 * 1024;

                if (!isIMG) {
                    showToast('Solo se permiten archivos en formato jpg, jpeg, png.', 'danger');
                    this.value = '';
                    return;
                }

                if (!isUnder1MB) {
                    showToast('El archivo supera el tamaño máximo de 1MB.', 'warning');
                    this.value = '';
                    return;
                }

                showToast('Archivo válido cargado.', 'success');
            });
        }
    });
    
    
    //validacion
    // Validación en tiempo real para CI (solo números)
    document.getElementById('cedula_identidad').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Validación en tiempo real para complemento (solo letras y números, max 2)
    document.getElementById('complemento').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-z0-9]/g, '').substring(0, 2);
    });

    // Validación en tiempo real para nombre (solo letras)
    document.getElementById('nombre').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '');
    });

    // Validación en tiempo real para apellido paterno (solo letras)
    document.getElementById('apellidoPaterno').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '');
    });

    // Validación en tiempo real para apellido materno (solo letras)
    document.getElementById('apellidoMaterno').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '');
    });

    // Validación en tiempo real para ciudad (solo letras)
    document.getElementById('ciudad').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '');
    });

    // Validación en tiempo real para zona (solo letras)
    document.getElementById('zona').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]/g, '');
    });

    // Validación en tiempo real para calle/avenida (solo letras)
    document.getElementById('calleAvenida').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]/g, '');
    });

    // Validación en tiempo real para nro domicilio (solo números, max 5)
    document.getElementById('numeroDomicilio').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-z0-9\s]/g, '').substring(0, 5);
    });

    // Validación en tiempo real para celular (solo números 6 o 7 al inicio)
    document.getElementById('celular').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value.length > 0 && !/^[6-7]/.test(this.value)) {
            this.value = '';
            showToast('El celular debe comenzar con 6 o 7', 'warning');
        }
        if (this.value.length > 8) {
            this.value = this.value.substring(0, 8);
        }
    });

    // Validación para marca de celular (max 30 caracteres)
    document.getElementById('marcaCelular').addEventListener('input', function(e) {
        if (this.value.length > 30) {
            this.value = this.value.substring(0, 30);
        }
    });

    // Validación para modelo de celular (max 30 caracteres)
    document.getElementById('modeloCelular').addEventListener('input', function(e) {
        if (this.value.length > 30) {
            this.value = this.value.substring(0, 30);
        }
    });

    // Validación para ID Recinto (formato d-dddd-ddddd)
    document.getElementById('idRecinto').addEventListener('input', function(e) {
        // Permitir solo dígitos y guiones en las posiciones correctas
        let value = this.value.replace(/[^0-9-]/g, '');
        
        // Asegurar el formato
        if (value.length > 1 && value.charAt(1) !== '-') {
            value = value.substring(0, 1) + '-' + value.substring(1);
        }
        if (value.length > 6 && value.charAt(6) !== '-') {
            value = value.substring(0, 6) + '-' + value.substring(6);
        }
        
        // Limitar longitud total
        if (value.length > 13) {
            value = value.substring(0, 13);
        }
        
        this.value = value;
    });
    // Función para mostrar notificaciones Toast
    function showToast(message, type = 'info') {
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
        
        // Eliminar el toast del DOM después de que se oculte
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
    document.getElementById('verificarForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const cedulaInput = document.getElementById('cedula_identidad');
        const cedula = cedulaInput.value.trim();
        
        // Validación de longitud (7 a 9 dígitos)
        if (cedula.length < 7 || cedula.length > 9) {
            showToast('La cédula debe contener entre 7 y 9 dígitos', 'warning');
            cedulaInput.focus();
            
            // Recargar la página después de 3 segundos (3000 milisegundos)
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
            return;
        }
        
        // Validación de solo números
        if (!/^\d+$/.test(cedula)) {
            showToast('La cédula solo debe contener números', 'warning');
            cedulaInput.focus();
            return;
        }
        
        try {
            const submitBtn = document.getElementById('btn_verificar');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verificando...';
            
            const response = await fetch(`/api/postulantes/existe?cedula_identidad=${cedula}`);
            const result = await response.json();
            
            submitBtn.innerHTML = originalBtnText;
            
            if (result.success && result.existe) {
                showToast('⚠️ El postulante ya está registrado.', 'warning');
                registroForm.classList.add('d-none');
            } else {
                //showToast('📝 Complete el formulario de registro.', 'info');
                registroForm.classList.remove('d-none');
                mensaje.classList.add('d-none');

                // Hacer scroll suave al formulario de registro
                registroForm.scrollIntoView({ behavior: 'smooth' });

                // Guardar en localStorage para usarlos en el submit final
                localStorage.setItem('cedula_identidad', cedula_identidad);
                localStorage.setItem('complemento', complemento);
                localStorage.setItem('expedicion', expedicion);


            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al verificar', 'danger');
        }
    });
    verificarForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cedula_identidad = verificarForm.cedula_identidad.value.trim();
        const complemento = verificarForm.complemento.value.trim();
        const expedicion = verificarForm.expedicion.value;

        if (!cedula_identidad || !expedicion) {
            showToast('⚠️ Debe completar los campos requeridos.', 'warning');
            
            // Deshabilitar inputs y botón
            const seccion = document.getElementById("seccion-verificacion");
            const inputs = seccion.querySelectorAll("input, select");
            const boton = document.getElementById("btn_verificar");
            
            inputs.forEach(input => {
                input.disabled = true;
            });
            boton.disabled = true;
            boton.style.opacity = "0.5";
            
            // Recargar la página después de 3 segundos (3000 milisegundos)
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
            return;
        }

        const url = `/api/postulantes/existe?cedula_identidad=${cedula_identidad}&complemento=${complemento}`;

        try {
            // Mostrar spinner de carga
            const submitBtn = verificarForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verificando...';
            

            const response = await fetch(url);
            const result = await response.json();

            // Restaurar botón
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;

            if (result.success && result.existe || (cedula_identidad.length < 7 || cedula_identidad.length > 9)) {
                showToast('⚠️ El postulante ya está registrado o no cumple criterio.', 'warning');
                registroForm.classList.add('d-none');
                submitBtn.disabled = true;
                
                // Recargar la página después de 3 segundos (3000ms)
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
                return;
            } else {
                showToast('📝 Complete el formulario de registro.', 'info');
                registroForm.classList.remove('d-none');
                mensaje.classList.add('d-none');
                submitBtn.innerHTML = '<span class="bi bi-check-circle" role="status" aria-hidden="true"></span> Verificado';
                submitBtn.class=
                submitBtn.disabled = true;
                // Hacer scroll suave al formulario de registro
                registroForm.scrollIntoView({ behavior: 'smooth' });

                // Guardar en localStorage para usarlos en el submit final
                localStorage.setItem('cedula_identidad', cedula_identidad);
                localStorage.setItem('complemento', complemento);
                localStorage.setItem('expedicion', expedicion);
            }
        } catch (error) {
            console.error('Error al verificar:', error);
            showToast('❌ Error de conexión al verificar.', 'danger');
            
            // Restaurar botón en caso de error
            const submitBtn = verificarForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Envío del formulario de registro
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar spinner de carga
        const submitBtn = registroForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';
        submitBtn.disabled = true;
    
        try {
            // Calcular experiencia_general
            const experienciaEspecifica = document.getElementById('experienciaEspecifica').value;
            const nroDeProcesosSelect = document.getElementById('nroDeProcesos');
            let experiencia_general = 0;
    
            if (experienciaEspecifica === 'SI') {
                experiencia_general = nroDeProcesosSelect.value === '10' ? 10 : parseInt(nroDeProcesosSelect.value) || 0;
            }
    
            // Crear FormData
            const formData = new FormData(registroForm);
            formData.append('experiencia_general', experiencia_general.toString());
            
            const cedulaIdentidad = document.getElementById('cedula_identidad').value;
            const complemento = document.getElementById('complemento').value;
            const expedicion = document.getElementById('expedicion').value;
        
            // Agregar los valores correctos al FormData
            formData.append('cedulaIdentidad', cedulaIdentidad);
            formData.append('complemento', complemento);
            formData.append('expedicion', expedicion);
        
    
            // Procesar TODOS los requisitos
            const requisitos = {
                esBoliviano: document.getElementById('esBoliviano').checked,
                registradoPadronElectoral: document.getElementById('registradoPadronElectoral').checked,
                cedulaIdentidadVigente: document.getElementById('cedulaIdentidadVigente').checked,
                disponibilidadTiempoCompleto: document.getElementById('disponibilidadTiempoCompleto').checked,
                celularConCamara: document.getElementById('celularConCamara').checked,
                android8_2OSuperior: document.getElementById('android8_2OSuperior').checked,
                lineaEntel: document.getElementById('lineaEntel').checked,
                ningunaMilitanciaPolitica: document.getElementById('ningunaMilitanciaPolitica').checked,
                sinConflictosInstitucion: document.getElementById('sinConflictosInstitucion').checked
            };
            formData.append('requisitos', JSON.stringify(requisitos));
    
            // Enviar datos al servidor
            const response = await fetch('/api/postulantes', {
                method: 'POST',
                body: formData
            });
    
            const result = await response.json();
    
            // Restaurar botón
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
    
            if (result.success) {
                showToast(result.message || '✅ Registro exitoso', 'success');
                
                // Descargar PDF automáticamente
                if (result.pdfUrl) {
                    const downloadLink = document.createElement('a');
                    downloadLink.href = result.pdfUrl;
                    downloadLink.download = result.pdfFilename;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
    
                // Resetear formulario después de 3 segundos
                setTimeout(() => {
                    registroForm.reset();
                    registroForm.classList.add('d-none');
                    window.location.reload();
                }, 3000);
            } else {
                showToast(result.message || '❌ Error al registrar', 'danger');
            }
    
        } catch (error) {
            console.error('Error:', error);
            showToast('❌ Error de conexión con el servidor', 'danger');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
    
    // Función mejorada para mostrar toasts
    function showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.error('No se encontró el contenedor de toasts');
            return;
        }
    
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        
        // Inicializar toast de Bootstrap
        const toast = new bootstrap.Toast(toastEl, {
            autohide: true,
            delay: 5000
        });
        toast.show();
        
        // Eliminar después de ocultarse
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }

    // Validación en tiempo real para CI (solo números)
    document.getElementById('cedula_identidad').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Validación en tiempo real para celular (solo números)
    document.getElementById('celular').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
        //habiliacion de campo carrera
        const select = document.getElementById('gradoInstruccion');
        const input = document.getElementById('carrera');
    
        select.addEventListener('change', () => {
            if (select.value === 'BACHILLER') {
              input.value = '';
              input.disabled = true;
            } else {
              input.disabled = false;
            }
          });
    
        //deshabilitar el campo de CI
        document.getElementById("btn_verificar").addEventListener("click", function () {
          const seccion = document.getElementById("seccion-verificacion");
          const inputs = seccion.querySelectorAll("input, select");
          const boton = document.getElementById("btn_verificar")
          
    
          // Deshabilitar todos los inputs dentro de la sección
          inputs.forEach(input => {
            input.disabled=true;
            //input.style.pointerEvents = "none"; // Deshabilita el input pero mantiene su valor
            //input.style.opacity = "0.5"
            boton.style.pointerEvents = "none"; // Deshabilita clics adicionales
            boton.style.opacity = "0.5"; // Cambia apariencia
            
            
          });
         
        });
    
        //habiliacion de campo carrera
        const select2 = document.getElementById('experienciaEspecifica');
        const select3 = document.getElementById('nroDeProcesos');
    
        select2.addEventListener('change', () => {
            if (select2.value === 'SI') {
                    select3.disabled = false; // Habilitar el campo
            } else {
                    select3.value = "0";
                    select3.disabled = true; // Deshabilitar el campo
            }
        });
});