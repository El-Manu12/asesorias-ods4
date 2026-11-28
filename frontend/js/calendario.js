(function () {
    const API_URL = 'http://localhost:3000/api';
    let usuario;
    try { usuario = JSON.parse(localStorage.getItem('usuarioActual') || 'null'); }
    catch (_) { return; }
    const areaUsuario = document.getElementById('areaUsuarioSesion');
    if (!usuario || !usuario.id || !areaUsuario || !window.bootstrap) return;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.id = 'btnCalendario';
    boton.className = 'btn btn-outline-secondary btn-sm';
    boton.textContent = '📅';
    boton.title = 'Abrir mi calendario privado';
    boton.setAttribute('aria-label', 'Abrir mi calendario privado');
    boton.setAttribute('aria-haspopup', 'dialog');
    const perfil = document.getElementById('linkPerfilUsuario');
    if (perfil) areaUsuario.insertBefore(boton, perfil);
    else areaUsuario.appendChild(boton);

    const estilos = document.createElement('style');
    estilos.textContent = `
        .calendario-semana,.calendario-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
        .calendario-semana div{text-align:center;font-size:.75rem;color:#6b7280;padding:5px 0}
        .calendario-dia{min-height:62px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;text-align:left;padding:6px;position:relative}
        .calendario-dia:hover{background:#edf3fb;border-color:#a9bfdf}
        .calendario-dia.otro-mes{color:#9ca3af;background:#f9fafb}
        .calendario-dia.seleccionado{border:2px solid #2557a7;background:#edf3fb}
        .calendario-dia.hoy .numero-dia{font-weight:800;color:#2557a7}
        .punto-evento{display:inline-block;width:7px;height:7px;border-radius:50%;background:#2557a7;margin:2px}
        .evento-calendario{border:1px solid #e5e7eb;border-radius:8px;padding:9px 10px;margin-bottom:8px;background:#fff}
        @media(max-width:767px){.calendario-dia{min-height:48px;padding:4px}.calendario-grid{gap:2px}}
    `;
    document.head.appendChild(estilos);

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'modalCalendario';
    modal.tabIndex = -1;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow">
                <div class="modal-header">
                    <div><h5 class="modal-title fw-bold mb-0">Mi calendario</h5><small class="text-muted">Agenda privada para organizar tus asesorías y actividades.</small></div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar calendario"></button>
                </div>
                <div class="modal-body"><div class="row g-4">
                    <section class="col-md-7" aria-label="Calendario mensual">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="btn-group btn-group-sm"><button type="button" class="btn btn-outline-secondary" id="mesAnterior" aria-label="Mes anterior">‹</button><button type="button" class="btn btn-outline-secondary" id="mesSiguiente" aria-label="Mes siguiente">›</button></div>
                            <strong class="text-capitalize" id="tituloMesCalendario"></strong>
                            <button type="button" class="btn btn-outline-primary btn-sm" id="btnHoyCalendario">Hoy</button>
                        </div>
                        <div class="calendario-semana"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div></div>
                        <div class="calendario-grid" id="rejillaCalendario"></div>
                    </section>
                    <section class="col-md-5 border-start-md" aria-label="Eventos del día">
                        <div class="d-flex justify-content-between align-items-center mb-2 gap-2"><h6 class="fw-bold mb-0" id="tituloDiaEventos"></h6><button type="button" class="btn btn-accent btn-sm text-nowrap" id="btnNuevoEvento">＋ Nuevo</button></div>
                        <div id="estadoCalendario" class="small" role="status" aria-live="polite"></div>
                        <div id="listaEventosDia" class="mb-3"></div>
                        <form id="formEventoCalendario" class="border-top pt-3">
                            <input type="hidden" id="eventoCalendarioId">
                            <div class="mb-2"><label class="form-label small fw-semibold" for="eventoTitulo">Título</label><input class="form-control form-control-sm" id="eventoTitulo" maxlength="120" required placeholder="Ej. Repasar álgebra"></div>
                            <div class="mb-2"><label class="form-label small fw-semibold" for="eventoFecha">Fecha</label><input class="form-control form-control-sm" id="eventoFecha" type="date" required></div>
                            <div class="row g-2 mb-2"><div class="col"><label class="form-label small fw-semibold" for="eventoHoraInicio">Inicio</label><input class="form-control form-control-sm" id="eventoHoraInicio" type="time" required></div><div class="col"><label class="form-label small fw-semibold" for="eventoHoraFin">Fin (opcional)</label><input class="form-control form-control-sm" id="eventoHoraFin" type="time"></div></div>
                            <div class="mb-3"><label class="form-label small fw-semibold" for="eventoDescripcion">Notas (opcional)</label><textarea class="form-control form-control-sm" id="eventoDescripcion" rows="2" maxlength="1000" placeholder="Lugar, enlace o recordatorio"></textarea></div>
                            <div class="d-flex gap-2"><button class="btn btn-primary btn-sm" id="btnGuardarEvento" type="submit">Guardar evento</button><button class="btn btn-outline-secondary btn-sm" id="btnCancelarEdicion" type="button" hidden>Cancelar</button></div>
                        </form>
                    </section>
                </div></div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    const controlModal = bootstrap.Modal.getOrCreateInstance(modal);
    const rejilla = modal.querySelector('#rejillaCalendario');
    const lista = modal.querySelector('#listaEventosDia');
    const estadoCalendario = modal.querySelector('#estadoCalendario');
    const tituloMes = modal.querySelector('#tituloMesCalendario');
    const tituloDia = modal.querySelector('#tituloDiaEventos');
    const formulario = modal.querySelector('#formEventoCalendario');
    const fechaActual = new Date();
    let mesVisible = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    let diaSeleccionado = convertirFecha(fechaActual);
    let eventos = [];

    function convertirFecha(fecha) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }

    function fechaDeTexto(texto) {
        const [año, mes, dia] = texto.split('-').map(Number);
        return new Date(año, mes - 1, dia);
    }

    function escapar(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function mostrarAviso(mensaje, error = false) {
        estadoCalendario.textContent = mensaje;
        estadoCalendario.className = error ? 'alert alert-danger py-2 px-3 small' : 'alert alert-success py-2 px-3 small';
        window.setTimeout(() => { estadoCalendario.textContent = ''; estadoCalendario.className = 'small'; }, 4500);
    }

    async function cargarEventos() {
        const inicio = convertirFecha(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1));
        const final = convertirFecha(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0));
        try {
            const res = await fetch(`${API_URL}/eventos_calendario?usuario_id=${encodeURIComponent(usuario.id)}&desde=${inicio}&hasta=${final}`);
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'No se pudieron cargar los eventos.');
            eventos = data.eventos || [];
            renderizarCalendario();
            renderizarEventosDia();
        } catch (err) {
            eventos = [];
            renderizarCalendario();
            lista.innerHTML = `<div class="alert alert-danger small">${escapar(err.message)}</div>`;
        }
    }

    function renderizarCalendario() {
        const año = mesVisible.getFullYear();
        const mes = mesVisible.getMonth();
        tituloMes.textContent = mesVisible.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        const primero = new Date(año, mes, 1);
        const desplazamiento = (primero.getDay() + 6) % 7;
        const cantidad = new Date(año, mes + 1, 0).getDate();
        const totalCeldas = Math.ceil((desplazamiento + cantidad) / 7) * 7;
        const hoy = convertirFecha(new Date());
        const eventosPorFecha = eventos.reduce((mapa, evento) => {
            mapa[evento.fecha] = (mapa[evento.fecha] || 0) + 1;
            return mapa;
        }, {});
        let html = '';
        for (let celda = 0; celda < totalCeldas; celda++) {
            const numero = celda - desplazamiento + 1;
            const fecha = convertirFecha(new Date(año, mes, numero));
            const deEsteMes = numero > 0 && numero <= cantidad;
            const clases = ['calendario-dia', deEsteMes ? '' : 'otro-mes', fecha === diaSeleccionado ? 'seleccionado' : '', fecha === hoy ? 'hoy' : ''].filter(Boolean).join(' ');
            const cantidadEventos = eventosPorFecha[fecha] || 0;
            html += `<button type="button" class="${clases}" data-fecha="${fecha}" aria-label="${fecha}${cantidadEventos ? `, ${cantidadEventos} eventos` : ''}"><span class="numero-dia">${fechaDeTexto(fecha).getDate()}</span>${cantidadEventos ? `<span class="d-block mt-1">${Array.from({length: Math.min(cantidadEventos, 3)}, () => '<i class="punto-evento"></i>').join('')}</span>` : ''}</button>`;
        }
        rejilla.innerHTML = html;
        rejilla.querySelectorAll('[data-fecha]').forEach(dia => dia.addEventListener('click', () => {
            diaSeleccionado = dia.dataset.fecha;
            resetearFormulario();
            const fechaClic = fechaDeTexto(diaSeleccionado);
            if (fechaClic.getMonth() !== mesVisible.getMonth() || fechaClic.getFullYear() !== mesVisible.getFullYear()) {
                mesVisible = new Date(fechaClic.getFullYear(), fechaClic.getMonth(), 1);
                cargarEventos();
                return;
            }
            renderizarCalendario();
            renderizarEventosDia();
        }));
    }

    function renderizarEventosDia() {
        const fechaBonita = fechaDeTexto(diaSeleccionado).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        tituloDia.textContent = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
        const delDia = eventos.filter(evento => evento.fecha === diaSeleccionado);
        if (!delDia.length) {
            lista.innerHTML = '<div class="small text-muted border rounded p-3">No tienes eventos para este día. Puedes agregar una actividad o una asesoría.</div>';
            return;
        }
        lista.innerHTML = delDia.map(evento => `<article class="evento-calendario"><div class="d-flex justify-content-between gap-2"><strong class="small">${escapar(evento.titulo)}</strong><div class="btn-group btn-group-sm"><button type="button" class="btn btn-link p-0 text-primary" data-editar="${evento.id}" aria-label="Editar ${escapar(evento.titulo)}">Editar</button><button type="button" class="btn btn-link p-0 ms-2 text-danger" data-eliminar="${evento.id}" aria-label="Eliminar ${escapar(evento.titulo)}">Eliminar</button></div></div><div class="small text-muted">${evento.hora_inicio}${evento.hora_fin ? `–${evento.hora_fin}` : ''}</div>${evento.descripcion ? `<div class="small mt-1">${escapar(evento.descripcion)}</div>` : ''}</article>`).join('');
        lista.querySelectorAll('[data-editar]').forEach(botonEditar => botonEditar.addEventListener('click', () => editarEvento(Number(botonEditar.dataset.editar))));
        lista.querySelectorAll('[data-eliminar]').forEach(botonEliminar => botonEliminar.addEventListener('click', () => eliminarEvento(Number(botonEliminar.dataset.eliminar))));
    }

    function resetearFormulario() {
        formulario.reset();
        modal.querySelector('#eventoCalendarioId').value = '';
        modal.querySelector('#eventoFecha').value = diaSeleccionado;
        modal.querySelector('#eventoHoraInicio').value = '09:00';
        modal.querySelector('#eventoHoraFin').value = '10:00';
        modal.querySelector('#btnGuardarEvento').textContent = 'Guardar evento';
        modal.querySelector('#btnCancelarEdicion').hidden = true;
    }

    function editarEvento(id) {
        const evento = eventos.find(elemento => Number(elemento.id) === id);
        if (!evento) return;
        diaSeleccionado = evento.fecha;
        modal.querySelector('#eventoCalendarioId').value = evento.id;
        modal.querySelector('#eventoTitulo').value = evento.titulo;
        modal.querySelector('#eventoFecha').value = evento.fecha;
        modal.querySelector('#eventoHoraInicio').value = evento.hora_inicio;
        modal.querySelector('#eventoHoraFin').value = evento.hora_fin || '';
        modal.querySelector('#eventoDescripcion').value = evento.descripcion || '';
        modal.querySelector('#btnGuardarEvento').textContent = 'Guardar cambios';
        modal.querySelector('#btnCancelarEdicion').hidden = false;
        renderizarCalendario();
        renderizarEventosDia();
    }

    async function eliminarEvento(id) {
        if (!confirm('¿Quieres eliminar este evento de tu calendario?')) return;
        try {
            const res = await fetch(`${API_URL}/eliminar_evento_calendario`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: usuario.id, evento_id: id })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo eliminar el evento.');
            resetearFormulario();
            await cargarEventos();
        } catch (err) { mostrarAviso(err.message, true); }
    }

    modal.querySelector('#mesAnterior').addEventListener('click', () => {
        mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);
        diaSeleccionado = convertirFecha(mesVisible);
        resetearFormulario();
        cargarEventos();
    });
    modal.querySelector('#mesSiguiente').addEventListener('click', () => {
        mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
        diaSeleccionado = convertirFecha(mesVisible);
        resetearFormulario();
        cargarEventos();
    });
    modal.querySelector('#btnHoyCalendario').addEventListener('click', () => {
        const hoy = new Date();
        mesVisible = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        diaSeleccionado = convertirFecha(hoy);
        resetearFormulario();
        cargarEventos();
    });
    modal.querySelector('#btnNuevoEvento').addEventListener('click', resetearFormulario);
    modal.querySelector('#btnCancelarEdicion').addEventListener('click', resetearFormulario);
    formulario.addEventListener('submit', async event => {
        event.preventDefault();
        const botonGuardar = modal.querySelector('#btnGuardarEvento');
        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Guardando…';
        const datos = {
            usuario_id: usuario.id,
            evento_id: modal.querySelector('#eventoCalendarioId').value || null,
            titulo: modal.querySelector('#eventoTitulo').value,
            descripcion: modal.querySelector('#eventoDescripcion').value,
            fecha: modal.querySelector('#eventoFecha').value,
            hora_inicio: modal.querySelector('#eventoHoraInicio').value,
            hora_fin: modal.querySelector('#eventoHoraFin').value
        };
        try {
            const res = await fetch(`${API_URL}/eventos_calendario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo guardar el evento.');
            diaSeleccionado = datos.fecha;
            mesVisible = new Date(fechaDeTexto(datos.fecha).getFullYear(), fechaDeTexto(datos.fecha).getMonth(), 1);
            resetearFormulario();
            await cargarEventos();
            mostrarAviso(data.message || 'Evento guardado.');
        } catch (err) { mostrarAviso(err.message, true); }
        finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = modal.querySelector('#eventoCalendarioId').value ? 'Guardar cambios' : 'Guardar evento';
        }
    });

    boton.addEventListener('click', () => {
        controlModal.show();
        cargarEventos();
    });
    resetearFormulario();
})();
