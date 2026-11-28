(function () {
    const API_URL = 'http://localhost:3000/api';
    let usuario;
    try { usuario = JSON.parse(localStorage.getItem('usuarioActual') || 'null'); }
    catch (_) { return; }
    const areaUsuario = document.getElementById('areaUsuarioSesion');
    if (!usuario || !usuario.id || !areaUsuario) return;

    const enlaceCerrarSesion = document.getElementById('btnSesionNav');
    if (enlaceCerrarSesion) enlaceCerrarSesion.addEventListener('click', () => {
        const token = localStorage.getItem('tokenSesion');
        if (token) fetch(`${API_URL}/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }, true);

    areaUsuario.classList.add('d-flex', 'align-items-center', 'gap-2');

    const estilos = document.createElement('style');
    estilos.textContent = `
        @keyframes avisoCampana { 0%,100% { box-shadow: 0 0 0 0 rgba(37,87,167,.35) } 50% { box-shadow: 0 0 0 6px rgba(37,87,167,0) } }
        #btnNotificaciones.tiene-notificaciones { background:#2557a7; border-color:#2557a7; color:#fff; animation:avisoCampana 1.8s infinite; }
        #panelNotificaciones { position:absolute; top:calc(100% + 10px); right:0; z-index:1080; width:min(360px, calc(100vw - 28px)); max-height: min(420px, calc(100vh - 100px)); display:flex; flex-direction:column; overflow:hidden; background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 12px 32px rgba(15,23,42,.18); }
        #panelNotificaciones[hidden] { display:none; }
        #listaNotificaciones { overflow-y:auto; }
        .notificacion-vacia { padding:24px 18px; text-align:center; color:#6b7280; }
        .notificacion-item { padding:12px 16px; border-top:1px solid #f1f3f5; }
        @media (max-width: 480px) { #panelNotificaciones { position:fixed; top:64px; right:12px; } }
    `;
    document.head.appendChild(estilos);

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.id = 'btnNotificaciones';
    boton.className = 'btn btn-outline-secondary btn-sm position-relative';
    boton.setAttribute('aria-label', 'Abrir notificaciones');
    boton.setAttribute('aria-controls', 'panelNotificaciones');
    boton.setAttribute('aria-expanded', 'false');
    boton.style.minWidth = '42px';
    boton.textContent = '🔔';
    const notificacionesArea = document.createElement('div');
    notificacionesArea.className = 'position-relative';
    areaUsuario.insertBefore(notificacionesArea, areaUsuario.firstChild);
    notificacionesArea.appendChild(boton);

    const panel = document.createElement('section');
    panel.id = 'panelNotificaciones';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notificaciones');
    panel.hidden = true;
    panel.innerHTML = '<div class="d-flex justify-content-between align-items-center px-3 py-2"><div><strong>Notificaciones</strong><div class="small text-muted">Avisos recientes</div></div><button type="button" class="btn-close" aria-label="Cerrar notificaciones"></button></div><div id="listaNotificaciones"><div class="notificacion-vacia">Cargando notificaciones…</div></div>';
    notificacionesArea.appendChild(panel);
    const lista = panel.querySelector('#listaNotificaciones');

    const enlacePerfil = document.createElement('a');
    enlacePerfil.id = 'linkPerfilUsuario';
    enlacePerfil.href = 'perfil.html';
    enlacePerfil.className = 'd-flex align-items-center gap-2 text-decoration-none';
    enlacePerfil.setAttribute('aria-label', 'Abrir mi perfil');
    const avatar = document.createElement('img');
    avatar.id = 'avatarUsuarioNav';
    avatar.src = usuario.avatar || 'uploads/usuario.png';
    avatar.onerror = () => { avatar.onerror = null; avatar.src = 'uploads/usuario.png'; };
    avatar.alt = '';
    avatar.width = 34;
    avatar.height = 34;
    avatar.style.cssText = 'width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb';
    const nombre = document.getElementById('lblUsuario') || document.createElement('span');
    nombre.id = 'lblUsuario';
    nombre.className = 'fw-bold small text-primary';
    nombre.textContent = usuario.nombre || 'Mi perfil';
    enlacePerfil.append(avatar, nombre);
    areaUsuario.appendChild(enlacePerfil);

    const menu = document.querySelector('#sidebar-wrapper .sidebar-menu');
    const esAdmin = String(usuario.rol || '').trim().toLowerCase() === 'admin';
    if (menu && !esAdmin) menu.querySelectorAll('a[href="admin.html"]').forEach(enlace => enlace.remove());
    if (esAdmin) {
        if (menu && !menu.querySelector('a[href="admin.html"]')) {
            const enlaceAdmin = document.createElement('a');
            enlaceAdmin.href = 'admin.html';
            enlaceAdmin.className = `nav-link-custom${location.pathname.endsWith('/admin.html') ? ' active' : ''}`;
            enlaceAdmin.innerHTML = '<span>🛡️</span> Administración';
            const cierreSesion = menu.querySelector('#btnSesionNav');
            if (cierreSesion) menu.insertBefore(enlaceAdmin, cierreSesion);
            else menu.appendChild(enlaceAdmin);
        }
        const enlaceAdmin = menu && menu.querySelector('a[href="admin.html"]');
        if (enlaceAdmin) enlaceAdmin.hidden = false;
    }

    function actualizarBoton(cantidad) {
        boton.classList.toggle('tiene-notificaciones', cantidad > 0);
        boton.innerHTML = cantidad > 0 ? `🔔 <span class="badge rounded-pill bg-danger">${cantidad > 99 ? '99+' : cantidad}</span>` : '🔔';
        boton.setAttribute('aria-label', cantidad > 0 ? `${cantidad} notificaciones sin leer` : 'No tienes notificaciones nuevas');
    }

    async function obtenerNotificaciones() {
        const res = await fetch(`${API_URL}/obtener_notificaciones?usuario_id=${encodeURIComponent(usuario.id)}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'No se pudieron cargar las notificaciones');
        return data.notificaciones || [];
    }

    function mostrarLista(notificaciones) {
        if (!notificaciones.length) {
            lista.innerHTML = '<div class="notificacion-vacia"><div class="fs-4 mb-1">✓</div>No tienes notificaciones nuevas.</div>';
            return;
        }
        lista.replaceChildren();
        notificaciones.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notificacion-item';
            const mensaje = document.createElement('div');
            mensaje.className = 'small';
            mensaje.textContent = n.mensaje || 'Notificación';
            item.appendChild(mensaje);
            if (n.creado_en) {
                const fecha = document.createElement('small');
                fecha.className = 'text-muted';
                fecha.textContent = new Date(n.creado_en).toLocaleString('es-MX');
                item.appendChild(fecha);
            }
            lista.appendChild(item);
        });
    }

    async function actualizarContador() {
        try { actualizarBoton((await obtenerNotificaciones()).length); }
        catch (err) { console.error('No se pudieron consultar las notificaciones:', err); }
    }

    async function abrirPanel() {
        panel.hidden = false;
        boton.setAttribute('aria-expanded', 'true');
        lista.innerHTML = '<div class="notificacion-vacia">Cargando notificaciones…</div>';
        try {
            const notificaciones = await obtenerNotificaciones();
            mostrarLista(notificaciones);
            if (notificaciones.length) {
                const res = await fetch(`${API_URL}/marcar_notificaciones_leidas`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario_id: usuario.id })
                });
                if (res.ok) actualizarBoton(0);
            } else actualizarBoton(0);
        } catch (err) {
            lista.innerHTML = '<div class="notificacion-vacia">No fue posible cargar las notificaciones. Intenta de nuevo.</div>';
            console.error(err);
        }
    }

    function cerrarPanel() {
        panel.hidden = true;
        boton.setAttribute('aria-expanded', 'false');
    }

    boton.addEventListener('click', () => panel.hidden ? abrirPanel() : cerrarPanel());
    panel.querySelector('.btn-close').addEventListener('click', cerrarPanel);
    document.addEventListener('click', event => {
        if (!panel.hidden && !notificacionesArea.contains(event.target)) cerrarPanel();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) { cerrarPanel(); boton.focus(); }
    });

    actualizarContador();
    window.setInterval(actualizarContador, 10000);
})();
