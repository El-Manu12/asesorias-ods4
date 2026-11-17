// server.js - Backend completo, optimizado y con consulta tolerante a fallos de IDs para AulaConnect
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '300kb' }));
app.use(cors());

// Servir la carpeta frontend de forma pública
app.use(express.static(path.join(__dirname, 'frontend')));

// Configuración de la Base de Datos MySQL usando un Pool robusto
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_asesorias_sistema',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificación inicial del Pool
db.getConnection((err, connection) => {
    if (err) {
        console.error("Error de conexión a la Base de Datos: " + err.stack);
        return;
    }
    console.log("Conectado exitosamente al Pool de la Base de Datos MySQL");
    connection.release();
});

function inicializarExtensiones(callback) {
    const crearCalendario = `CREATE TABLE IF NOT EXISTS calendario_eventos (
        id int(11) NOT NULL AUTO_INCREMENT,
        usuario_id int(11) NOT NULL,
        titulo varchar(120) NOT NULL,
        descripcion text DEFAULT NULL,
        fecha date NOT NULL,
        hora_inicio time NOT NULL,
        hora_fin time DEFAULT NULL,
        creado_en timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (id),
        KEY idx_calendario_usuario_fecha (usuario_id, fecha),
        CONSTRAINT calendario_eventos_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
    db.query(crearCalendario, (errCalendario) => {
        if (errCalendario) return callback(errCalendario);
        db.query('SHOW COLUMNS FROM `mensajes`', (errMensajes, columnasMensajes) => {
            if (errMensajes) return callback(errMensajes);
            const tieneContexto = columnasMensajes.some(columna => columna.Field === 'asesoria_id');
            const prepararReseñas = () => db.query('SHOW COLUMNS FROM `reseñas`', (errColumnas, columnas) => {
            if (errColumnas) return callback(errColumnas);
            const existentes = new Set(columnas.map(columna => columna.Field));
            const nuevas = [
                ['solicitud_id', 'INT NULL'],
                ['revisor_id', 'INT NULL'],
                ['usuario_evaluado_id', 'INT NULL'],
                ['tipo', "ENUM('asesoria','asesor','usuario') NOT NULL DEFAULT 'asesoria'"]
            ].filter(([nombre]) => !existentes.has(nombre));
            const agregarSiguiente = () => {
                if (!nuevas.length) return verificarIndiceUnico();
                const [nombre, definicion] = nuevas.shift();
                db.query(`ALTER TABLE \`reseñas\` ADD COLUMN \`${nombre}\` ${definicion}`, (errAlter) => {
                    if (errAlter) return callback(errAlter);
                    agregarSiguiente();
                });
            };
            const verificarIndiceUnico = () => {
                db.query('SHOW INDEX FROM `reseñas`', (errIndices, indices) => {
                    if (errIndices) return callback(errIndices);
                    if (indices.some(indice => indice.Key_name === 'uniq_resena_solicitud_tipo')) return callback(null);
                    db.query('ALTER TABLE `reseñas` ADD UNIQUE KEY uniq_resena_solicitud_tipo (solicitud_id, tipo)', callback);
                });
            };
            agregarSiguiente();
            });
            if (tieneContexto) return prepararReseñas();
            db.query('ALTER TABLE `mensajes` ADD COLUMN `asesoria_id` INT NULL AFTER `destinatario_id`', errAlterMensajes => {
                if (errAlterMensajes) return callback(errAlterMensajes);
                prepararReseñas();
            });
        });
    });
}

// Función auxiliar para generar código único aleatorio de 5 dígitos
function generarCodigoUnico(callback) {
    const codigo = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    db.query("SELECT id FROM usuarios WHERE codigo_unico = ?", [codigo], (err, results) => {
        if (err) {
            console.error("Error generando código:", err.message);
            return generarCodigoUnico(callback);
        }
        if (results && results.length > 0) {
            generarCodigoUnico(callback);
        } else {
            callback(codigo);
        }
    });
}

// ==========================================
// 1. AUTENTICACIÓN Y USUARIOS
// ==========================================
app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;
    db.query("SELECT * FROM usuarios WHERE correo = ? AND password = ?", [correo, password], (err, results) => {
        if (err) return res.json({ success: false, message: "Error en el servidor", error: err.message });
        
        if (results && results.length > 0) {
            let usuario = results[0];
            if (!usuario.codigo_unico) {
                generarCodigoUnico((nuevoCodigo) => {
                    db.query("UPDATE usuarios SET codigo_unico = ? WHERE id = ?", [nuevoCodigo, usuario.id], () => {
                        usuario.codigo_unico = nuevoCodigo;
                        res.json({ success: true, message: "Login exitoso", usuario });
                    });
                });
            } else {
                res.json({ success: true, message: "Login exitoso", usuario });
            }
        } else {
            res.json({ success: false, message: "Credenciales incorrectas" });
        }
    });
});

app.post('/api/registro', (req, res) => {
    const { nombre, correo, password, carrera, semestre, rol = 'estudiante' } = req.body;
    db.query("SELECT id FROM usuarios WHERE correo = ?", [correo], (err, results) => {
        if (err) return res.json({ success: false, message: err.message });
        if (results && results.length > 0) {
            return res.json({ success: false, message: "El correo ya está registrado" });
        }

        generarCodigoUnico((codigoUnico) => {
            const sql = "INSERT INTO usuarios (nombre, correo, password, rol, carrera, semestre, codigo_unico) VALUES (?, ?, ?, ?, ?, ?, ?)";
            db.query(sql, [nombre, correo, password, rol, carrera, semestre, codigoUnico], (err, result) => {
                if (err) return res.json({ success: false, message: "Error al registrar", error: err.message });
                res.json({ success: true, message: "Usuario registrado correctamente", id: result.insertId, codigo_unico: codigoUnico });
            });
        });
    });
});

app.post('/api/update_perfil', (req, res) => {
    const { id, nombre, carrera, semestre, password } = req.body;
    if (!id) return res.json({ success: false, message: "ID de usuario no proporcionado" });

    let sql = "UPDATE usuarios SET nombre = ?, carrera = ?, semestre = ?";
    let params = [nombre, carrera, semestre];

    if (password && password.trim() !== '') {
        sql += ", password = ?";
        params.push(password);
    }

    sql += " WHERE id = ?";
    params.push(id);

    db.query(sql, params, (err) => {
        if (err) return res.json({ success: false, message: err.message });
        
        db.query("SELECT id, nombre, correo, rol, carrera, semestre, codigo_unico, avatar FROM usuarios WHERE id = ?", [id], (err2, rows) => {
            if (err2 || !rows || rows.length === 0) {
                return res.json({ success: true, message: "Perfil actualizado correctamente" });
            }
            res.json({ success: true, message: "Perfil actualizado correctamente", usuario: rows[0] });
        });
    });
});

app.post('/api/update_avatar', (req, res) => {
    const usuarioId = Number(req.body.usuario_id);
    const imagen = String(req.body.imagen || '');
    const coincidencia = imagen.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!usuarioId || !coincidencia) return res.status(400).json({ success: false, message: 'Selecciona una imagen válida.' });
    const buffer = Buffer.from(coincidencia[2], 'base64');
    if (!buffer.length || buffer.length > 150 * 1024) return res.status(413).json({ success: false, message: 'La imagen debe pesar menos de 150 KB después de comprimirla.' });

    const carpeta = path.join(__dirname, 'frontend', 'uploads', 'avatars');
    const nombreArchivo = `usuario_${usuarioId}_${Date.now()}.${coincidencia[1] === 'jpeg' ? 'jpg' : coincidencia[1]}`;
    const rutaArchivo = path.join(carpeta, nombreArchivo);
    const rutaPublica = `/uploads/avatars/${nombreArchivo}`;
    fs.mkdir(carpeta, { recursive: true }, (errDir) => {
        if (errDir) return res.status(500).json({ success: false, message: 'No se pudo preparar el almacenamiento de imágenes.' });
        fs.writeFile(rutaArchivo, buffer, (errArchivo) => {
            if (errArchivo) return res.status(500).json({ success: false, message: 'No se pudo guardar la imagen.' });
            db.query('UPDATE usuarios SET avatar = ? WHERE id = ?', [rutaPublica, usuarioId], (errUpdate, resultUpdate) => {
                if (errUpdate) {
                    return fs.unlink(rutaArchivo, () => res.status(500).json({ success: false, message: errUpdate.message }));
                }
                if (!resultUpdate.affectedRows) {
                    return fs.unlink(rutaArchivo, () => res.status(404).json({ success: false, message: 'No se encontró el usuario.' }));
                }
                db.query('SELECT id, nombre, correo, rol, carrera, semestre, codigo_unico, avatar FROM usuarios WHERE id = ?', [usuarioId], (errUser, rows) => {
                    if (errUser || !rows.length) return res.status(500).json({ success: false, message: 'La imagen se guardó, pero no se pudo actualizar el perfil.' });
                    res.json({ success: true, usuario: rows[0] });
                });
            });
        });
    });
});

app.get('/api/obtener_mi_codigo', (req, res) => {
    const usuario_id = req.query.usuario_id || 0;
    db.query("SELECT codigo_unico FROM usuarios WHERE id = ?", [usuario_id], (err, results) => {
        if (err) return res.json({ success: false, message: err.message });
        if (results && results.length > 0 && results[0].codigo_unico) {
            res.json({ success: true, codigo_unico: results[0].codigo_unico });
        } else {
            generarCodigoUnico((nuevoCodigo) => {
                db.query("UPDATE usuarios SET codigo_unico = ? WHERE id = ?", [nuevoCodigo, usuario_id], () => {
                    res.json({ success: true, codigo_unico: nuevoCodigo });
                });
            });
        }
    });
});

app.get('/api/obtener_usuarios', (req, res) => {
    db.query("SELECT id, nombre, correo, rol, carrera, semestre, codigo_unico FROM usuarios", (err, results) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, usuarios: results });
    });
});

// ==========================================
// 2. MATERIAS Y ASESORÍAS
// ==========================================
app.get('/api/obtener_materias', (req, res) => {
    db.query("SELECT * FROM materias", (err, results) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, materias: results });
    });
});

app.get('/api/get_asesorias', (req, res) => {
    const search = req.query.search || '';
    let sql = `SELECT a.*, u.nombre AS tutor_nombre, u.carrera, u.semestre, u.avatar,
               COALESCE(NULLIF(m.nombre_materia, ''), NULLIF(m.descripcion, ''), a.materia, 'General') AS materia,
               COALESCE(rv.promedio_calificacion, 0) AS promedio_calificacion,
               COALESCE(rv.total_reseñas, 0) AS total_reseñas,
               COALESCE(rt.promedio_calificacion, 0) AS promedio_tutor,
               COALESCE(rt.total_reseñas, 0) AS total_reseñas_tutor
               FROM asesorias a 
               JOIN usuarios u ON a.usuario_id = u.id 
               LEFT JOIN materias m ON a.materia_id = m.id
               LEFT JOIN (SELECT asesoria_id, AVG(calificacion) AS promedio_calificacion, COUNT(*) AS total_reseñas FROM reseñas WHERE tipo = 'asesoria' OR solicitud_id IS NULL GROUP BY asesoria_id) rv ON rv.asesoria_id = a.id
               LEFT JOIN (SELECT asesor_id, AVG(calificacion) AS promedio_calificacion, COUNT(*) AS total_reseñas FROM reseñas WHERE tipo = 'asesor' OR solicitud_id IS NULL GROUP BY asesor_id) rt ON rt.asesor_id = a.usuario_id`;
    
    let params = [];
    if (search) {
        sql += ` WHERE a.titulo_tema LIKE ? OR a.descripcion LIKE ? OR m.nombre_materia LIKE ? OR m.descripcion LIKE ? OR a.materia LIKE ? OR u.nombre LIKE ?`;
        const term = `%${search}%`;
        params = [term, term, term, term, term, term];
    }
    sql += ` ORDER BY a.id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(results || []);
    });
});

app.post('/api/save_asesoria', (req, res) => {
    const { id, usuario_id, materia = 'General', titulo_tema = '', descripcion = '', modalidad = 'virtual', hora_inicio_presencial, hora_fin_presencial, lugares_presencial, hora_inicio_digital, hora_fin_digital, plataformas_digital, dias_semana } = req.body;

    db.getConnection((errConn, connection) => {
        if (errConn) {
            return res.json({ success: false, message: "Error al obtener conexión de base de datos: " + errConn.message });
        }

        const ejecutarGuardado = (matId, nombreMateria) => {
            if (id) {
                const sql = `UPDATE asesorias SET materia_id = ?, materia = ?, titulo_tema = ?, descripcion = ?, modalidad = ?, hora_inicio_presencial = ?, hora_fin_presencial = ?, lugares_presencial = ?, hora_inicio_digital = ?, hora_fin_digital = ?, plataformas_digital = ?, dias_semana = ? WHERE id = ? AND usuario_id = ?`;
                connection.query(sql, [matId, nombreMateria, titulo_tema, descripcion, modalidad, hora_inicio_presencial || null, hora_fin_presencial || null, lugares_presencial || null, hora_inicio_digital || null, hora_fin_digital || null, plataformas_digital || null, dias_semana || null, id, usuario_id], (err) => {
                    connection.release();
                    if (err) return res.json({ success: false, message: err.message });
                    res.json({ success: true, message: "Asesoría actualizada correctamente" });
                });
            } else {
                const sql = `INSERT INTO asesorias (usuario_id, materia_id, materia, titulo_tema, descripcion, modalidad, hora_inicio_presencial, hora_fin_presencial, lugares_presencial, hora_inicio_digital, hora_fin_digital, plataformas_digital, dias_semana) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                connection.query(sql, [usuario_id, matId, nombreMateria, titulo_tema, descripcion, modalidad, hora_inicio_presencial || null, hora_fin_presencial || null, lugares_presencial || null, hora_inicio_digital || null, hora_fin_digital || null, plataformas_digital || null, dias_semana || null], (err) => {
                    connection.release();
                    if (err) return res.json({ success: false, message: err.message });
                    res.json({ success: true, message: "Asesoría publicada correctamente" });
                });
            }
        };

        let parsedId = parseInt(materia);
        if (!isNaN(parsedId) && isNaN(materia)) {
            connection.query("SELECT COALESCE(nombre_materia, nombre, 'General') AS nombre FROM materias WHERE id = ?", [parsedId], (errMat, resMat) => {
                let nombreMat = (resMat && resMat.length > 0) ? resMat[0].nombre : 'General';
                ejecutarGuardado(parsedId, nombreMat);
            });
            return;
        }

        connection.query("SHOW COLUMNS FROM materias", (errCols, cols) => {
            if (errCols || !cols || cols.length === 0) {
                return ejecutarGuardado(1, materia);
            }

            const nombresColumnas = cols.map(c => c.Field.toLowerCase());
            let colValida = 'id';
            if (nombresColumnas.includes('nombre_materia')) colValida = 'nombre_materia';
            else if (nombresColumnas.includes('nombre')) colValida = 'nombre';
            else if (nombresColumnas.includes('titulo')) colValida = 'titulo';
            else colValida = cols[0].Field;

            connection.query(`SELECT id FROM materias WHERE ${colValida} = ?`, [materia], (errSearch, results) => {
                if (errSearch || !results || results.length === 0) {
                    connection.query(`INSERT INTO materias (${colValida}) VALUES (?)`, [materia], (errIns, insRes) => {
                        if (errIns) {
                            connection.release();
                            return ejecutarGuardado(1, materia);
                        }
                        ejecutarGuardado(insRes.insertId, materia);
                    });
                } else {
                    ejecutarGuardado(results[0].id, materia);
                }
            });
        });
    });
});

// ==========================================
// 3. SOLICITUDES (Consulta tolerante con LEFT JOIN para mostrar todo)
// ==========================================
function crearNotificacion(usuarioId, mensaje, callback = () => {}) {
    if (!usuarioId || !mensaje) return callback();
    db.query("INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)", [usuarioId, mensaje], callback);
}

app.post('/api/solicitar_asesoria', (req, res) => {
    const { asesoria_id, estudiante_id, mensaje = 'Hola, me interesa tu asesoría.' } = req.body;
    if (!asesoria_id || !estudiante_id) return res.status(400).json({ success: false, message: "Faltan datos de la solicitud" });
    db.query("SELECT usuario_id, titulo_tema FROM asesorias WHERE id = ?", [asesoria_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!rows.length) return res.status(404).json({ success: false, message: "La asesoría ya no está disponible" });
        const asesoria = rows[0];
        if (Number(asesoria.usuario_id) === Number(estudiante_id)) return res.status(400).json({ success: false, message: "No puedes solicitar tu propia asesoría" });
        const sql = "INSERT INTO solicitudes (asesoria_id, estudiante_solicitante_id, mensaje, estado_solicitud) VALUES (?, ?, ?, 'pendiente')";
        db.query(sql, [asesoria_id, estudiante_id, mensaje], (insertErr) => {
            if (insertErr) return res.status(500).json({ success: false, message: "Error al enviar solicitud: " + insertErr.message });
            crearNotificacion(asesoria.usuario_id, `Nueva solicitud de asesoría para “${asesoria.titulo_tema}”.`);
            res.json({ success: true, message: "Solicitud enviada correctamente" });
        });
    });
});

function procesarObtencionSolicitudes(req, res) {
    const usuarioId = Number(req.query.usuario_id);
    if (!usuarioId) return res.status(400).json({ success: false, message: "Falta el ID de usuario", solicitudes: [] });
    const sql = `SELECT s.id, s.asesoria_id, s.estudiante_solicitante_id AS estudiante_id,
                        s.estado_solicitud AS estado, s.fecha_solicitud,
                        COALESCE(NULLIF(s.comentario_detallado, ''), s.mensaje, '') AS mensaje,
                        a.usuario_id AS tutor_id, a.titulo_tema AS asesoria_titulo,
                        e.nombre AS estudiante_nombre, e.correo AS estudiante_correo,
                        t.nombre AS tutor_nombre,
                        COALESCE(ur.promedio, 0) AS estudiante_promedio,
                        COALESCE(ur.total, 0) AS estudiante_total_resenas,
                        CASE WHEN a.usuario_id = ? THEN 'recibida' ELSE 'hecha' END AS tipo,
                        COALESCE(r.ya_reseña_asesoria, 0) AS ya_reseña_asesoria,
                        COALESCE(r.ya_reseña_asesor, 0) AS ya_reseña_asesor,
                        COALESCE(r.ya_reseño_usuario, 0) AS ya_reseño_usuario
                 FROM solicitudes s
                 JOIN asesorias a ON a.id = s.asesoria_id
                 JOIN usuarios e ON e.id = s.estudiante_solicitante_id
                 JOIN usuarios t ON t.id = a.usuario_id
                 LEFT JOIN (SELECT usuario_evaluado_id, AVG(calificacion) AS promedio, COUNT(*) AS total FROM reseñas WHERE tipo = 'usuario' GROUP BY usuario_evaluado_id) ur ON ur.usuario_evaluado_id = e.id
                 LEFT JOIN (SELECT solicitud_id,
                                   MAX(tipo = 'asesoria') AS ya_reseña_asesoria,
                                   MAX(tipo = 'asesor') AS ya_reseña_asesor,
                                   MAX(tipo = 'usuario') AS ya_reseño_usuario
                            FROM reseñas WHERE solicitud_id IS NOT NULL GROUP BY solicitud_id) r ON r.solicitud_id = s.id
                 WHERE s.estudiante_solicitante_id = ? OR a.usuario_id = ?
                 ORDER BY s.fecha_solicitud DESC, s.id DESC`;
    db.query(sql, [usuarioId, usuarioId, usuarioId], (err, resultados) => {
        if (err) return res.status(500).json({ success: false, message: err.message, solicitudes: [] });
        const solicitudes = resultados || [];
        res.json({ success: true, solicitudes, recibidas: solicitudes.filter(s => s.tipo === 'recibida'), hechas: solicitudes.filter(s => s.tipo === 'hecha') });
    });
}

app.get('/api/obtener_solicitudes', (req, res) => {
    procesarObtencionSolicitudes(req, res);
});

app.post('/api/actualizar_estado_solicitud', (req, res) => {
    const { solicitud_id, estado, usuario_id } = req.body;
    const estadosPermitidos = ['aceptada', 'rechazada', 'completada'];
    if (!solicitud_id || !usuario_id || !estadosPermitidos.includes(estado)) return res.status(400).json({ success: false, message: "Datos de actualización inválidos" });
    const sqlInfo = `SELECT s.id, s.estado_solicitud, s.estudiante_solicitante_id AS estudiante_id,
                            a.usuario_id AS tutor_id, a.titulo_tema AS asesoria_titulo
                     FROM solicitudes s JOIN asesorias a ON a.id = s.asesoria_id WHERE s.id = ?`;
    db.query(sqlInfo, [solicitud_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!rows.length) return res.status(404).json({ success: false, message: "Solicitud no encontrada" });
        const solicitud = rows[0];
        if (Number(solicitud.tutor_id) !== Number(usuario_id)) return res.status(403).json({ success: false, message: "Solo el asesor puede actualizar esta solicitud" });
        if (estado === 'completada' && solicitud.estado_solicitud !== 'aceptada') return res.status(400).json({ success: false, message: "Solo se puede completar una asesoría aceptada" });
        if (estado !== 'completada' && solicitud.estado_solicitud !== 'pendiente') return res.status(400).json({ success: false, message: "Esta solicitud ya fue respondida" });
        db.query("UPDATE solicitudes SET estado_solicitud = ? WHERE id = ?", [estado, solicitud_id], (updateErr) => {
            if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
            if (estado === 'aceptada') {
                const contactos = [
                    [solicitud.estudiante_id, solicitud.tutor_id, 'Tutor'],
                    [solicitud.tutor_id, solicitud.estudiante_id, 'Estudiante']
                ];
                contactos.forEach(([usuario, contacto, apodo]) => db.query(
                    "INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM contactos WHERE usuario_id = ? AND contacto_id = ?)",
                    [usuario, contacto, apodo, usuario, contacto]
                ));
            }
            const texto = estado === 'completada'
                ? `La asesoría “${solicitud.asesoria_titulo}” se marcó como completada. Ya puedes dejar tu reseña.`
                : `Tu solicitud para “${solicitud.asesoria_titulo}” fue ${estado}.`;
            crearNotificacion(solicitud.estudiante_id, texto);
            res.json({ success: true, message: "Estado actualizado" });
        });
    });
});

// ==========================================
// 4. CONTACTOS Y APODOS
// ==========================================
app.get('/api/obtener_contactos', (req, res) => {
    const usuario_id = req.query.usuario_id || 0;
    const sql = `SELECT DISTINCT u.id, u.nombre, u.correo, u.codigo_unico, u.carrera, u.semestre, c.apodo_personalizado
                 FROM usuarios u
                 LEFT JOIN contactos c ON c.contacto_id = u.id AND c.usuario_id = ?
                 WHERE c.usuario_id IS NOT NULL OR EXISTS (
                     SELECT 1 FROM solicitudes s JOIN asesorias a ON a.id = s.asesoria_id
                     WHERE s.estado_solicitud IN ('aceptada','completada')
                       AND ((s.estudiante_solicitante_id = ? AND a.usuario_id = u.id)
                         OR (s.estudiante_solicitante_id = u.id AND a.usuario_id = ?))
                 )`;
    db.query(sql, [usuario_id, usuario_id, usuario_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, contactos: results });
    });
});

app.post('/api/agregar_contacto', (req, res) => {
    const { usuario_id, termino, apodo } = req.body;
    if (!usuario_id || !termino) return res.json({ success: false, message: "Datos incompletos" });

    db.query("SELECT id FROM usuarios WHERE codigo_unico = ? OR correo = ? OR id = ?", [termino, termino, termino], (err, results) => {
        if (err) return res.json({ success: false, message: err.message });
        if (!results || results.length === 0) return res.json({ success: false, message: "Usuario no encontrado con ese Código ID o Correo" });

        const contacto_id = results[0].id;
        if (usuario_id == contacto_id) return res.json({ success: false, message: "No te puedes agregar a ti mismo" });

        db.query("SELECT id FROM contactos WHERE usuario_id = ? AND contacto_id = ?", [usuario_id, contacto_id], (err, check) => {
            if (check && check.length > 0) return res.json({ success: false, message: "Este usuario ya está en tus contactos" });

            db.query("INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) VALUES (?, ?, ?)", [usuario_id, contacto_id, apodo || null], (err) => {
                if (err) return res.json({ success: false, message: err.message });
                res.json({ success: true, message: "¡Contacto agregado con éxito!" });
            });
        });
    });
});

app.post('/api/actualizar_apodo', (req, res) => {
    const { usuario_id, contacto_id, apodo } = req.body;
    db.query("SELECT id FROM contactos WHERE usuario_id = ? AND contacto_id = ?", [usuario_id, contacto_id], (err, check) => {
        if (check && check.length > 0) {
            db.query("UPDATE contactos SET apodo_personalizado = ? WHERE usuario_id = ? AND contacto_id = ?", [apodo || null, usuario_id, contacto_id], (errUpdate) => {
                if (errUpdate) return res.status(500).json({ success: false, message: errUpdate.message });
                res.json({ success: true, message: "Apodo actualizado" });
            });
        } else {
            db.query("INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) VALUES (?, ?, ?)", [usuario_id, contacto_id, apodo || null], (errInsert) => {
                if (errInsert) return res.status(500).json({ success: false, message: errInsert.message });
                res.json({ success: true, message: "Apodo actualizado" });
            });
        }
    });
});

app.post('/api/eliminar_contacto', (req, res) => {
    const { usuario_id, contacto_id } = req.body;
    if (!usuario_id || !contacto_id) return res.status(400).json({ success: false, message: "Faltan datos del contacto" });
    db.query("DELETE FROM contactos WHERE usuario_id = ? AND contacto_id = ?", [usuario_id, contacto_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "El contacto no existe en tu lista" });
        res.json({ success: true, message: "Contacto eliminado" });
    });
});

// ==========================================
// 5. MENSAJERÍA Y CHAT
// ==========================================
app.post('/api/enviar_mensaje_chat', (req, res) => {
    const { remitente_id, destinatario_id, mensaje } = req.body;
    const asesoria_id = req.body.asesoria_id ? Number(req.body.asesoria_id) : null;
    if (!remitente_id || !destinatario_id || !mensaje) return res.json({ success: false, message: "Datos incompletos" });

    const insertarMensaje = () => db.query("INSERT INTO mensajes (remitente_id, destinatario_id, asesoria_id, mensaje) VALUES (?, ?, ?, ?)", [remitente_id, destinatario_id, asesoria_id, String(mensaje).trim()], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        db.query("SELECT u.nombre, a.titulo_tema FROM usuarios u LEFT JOIN asesorias a ON a.id = ? WHERE u.id = ?", [asesoria_id, remitente_id], (nameErr, rows) => {
            const nombre = !nameErr && rows && rows[0] ? rows[0].nombre : 'Un contacto';
            const contexto = !nameErr && rows && rows[0] && rows[0].titulo_tema ? ` sobre “${rows[0].titulo_tema}”` : '';
            crearNotificacion(destinatario_id, `Nuevo mensaje de ${nombre}${contexto}.`);
        });
        res.json({ success: true, message: "Enviado" });
    });
    if (!asesoria_id) return insertarMensaje();
    const sqlContexto = `SELECT s.id FROM solicitudes s JOIN asesorias a ON a.id = s.asesoria_id
                         WHERE s.asesoria_id = ? AND s.estado_solicitud IN ('aceptada','completada')
                         AND ((s.estudiante_solicitante_id = ? AND a.usuario_id = ?) OR (s.estudiante_solicitante_id = ? AND a.usuario_id = ?)) LIMIT 1`;
    db.query(sqlContexto, [asesoria_id, remitente_id, destinatario_id, destinatario_id, remitente_id], (errContexto, rows) => {
        if (errContexto) return res.status(500).json({ success: false, message: errContexto.message });
        if (!rows.length) return res.status(403).json({ success: false, message: 'No hay una asesoría aceptada entre estas personas con ese contexto.' });
        insertarMensaje();
    });
});

app.get('/api/asesorias_contacto', (req, res) => {
    const usuarioId = Number(req.query.usuario_id);
    const contactoId = Number(req.query.contacto_id);
    if (!usuarioId || !contactoId || usuarioId === contactoId) return res.status(400).json({ success: false, message: 'Indica un contacto válido.' });
    const sql = `SELECT DISTINCT a.id AS asesoria_id, a.titulo_tema,
                        COALESCE(NULLIF(m.nombre_materia, ''), NULLIF(m.descripcion, ''), a.materia, 'General') AS materia,
                        a.modalidad, a.dias_semana
                 FROM solicitudes s JOIN asesorias a ON a.id = s.asesoria_id
                 LEFT JOIN materias m ON m.id = a.materia_id
                 WHERE s.estado_solicitud IN ('aceptada','completada')
                   AND ((s.estudiante_solicitante_id = ? AND a.usuario_id = ?) OR (s.estudiante_solicitante_id = ? AND a.usuario_id = ?))
                 ORDER BY a.titulo_tema`;
    db.query(sql, [usuarioId, contactoId, contactoId, usuarioId], (err, asesorias) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, asesorias: asesorias || [] });
    });
});

app.get('/api/obtener_mensajes_chat', (req, res) => {
    const { user1, user2 } = req.query;
    const asesoriaId = req.query.asesoria_id ? Number(req.query.asesoria_id) : null;
    const sql = "SELECT * FROM mensajes WHERE ((remitente_id = ? AND destinatario_id = ?) OR (remitente_id = ? AND destinatario_id = ?)) AND ((? IS NULL AND asesoria_id IS NULL) OR asesoria_id = ?) ORDER BY fecha_envio ASC, id ASC";
    db.query(sql, [user1, user2, user2, user1, asesoriaId, asesoriaId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        db.query("UPDATE mensajes SET leido = 1 WHERE remitente_id = ? AND destinatario_id = ? AND ((? IS NULL AND asesoria_id IS NULL) OR asesoria_id = ?)", [user2, user1, asesoriaId, asesoriaId], () => {});
        res.json({ success: true, mensajes: results });
    });
});

// ==========================================
// 6. RESEÑAS, ADMINISTRACIÓN Y COMPATIBILIDAD ?action=
// ==========================================
app.get('/api', (req, res) => {
    const action = req.query.action;
    if (action === 'obtener_solicitudes') {
        procesarObtencionSolicitudes(req, res);
    } else if (action === 'obtener_mi_codigo') {
        req.url = `/api/obtener_mi_codigo?usuario_id=${encodeURIComponent(req.query.usuario_id || '')}`;
        app.handle(req, res);
    } else if (action === 'obtener_contactos') {
        req.url = `/api/obtener_contactos?usuario_id=${encodeURIComponent(req.query.usuario_id || '')}`;
        app.handle(req, res);
    } else if (action === 'obtener_mensajes_chat') {
        req.url = `/api/obtener_mensajes_chat?user1=${encodeURIComponent(req.query.user1 || '')}&user2=${encodeURIComponent(req.query.user2 || '')}&asesoria_id=${encodeURIComponent(req.query.asesoria_id || '')}`;
        app.handle(req, res);
    } else {
        res.status(404).json({ success: false, message: "Acción GET no encontrada" });
    }
});

app.post('/api', (req, res) => {
    const action = req.query.action;
    if (action === 'actualizar_estado_solicitud') {
        req.url = '/api/actualizar_estado_solicitud';
        app.handle(req, res);
    } else if (action === 'actualizar_apodo') {
        req.url = '/api/actualizar_apodo';
        app.handle(req, res);
    } else if (action === 'agregar_contacto') {
        req.url = '/api/agregar_contacto';
        app.handle(req, res);
    } else if (action === 'enviar_mensaje_chat') {
        req.url = '/api/enviar_mensaje_chat';
        app.handle(req, res);
    } else if (action === 'update_perfil') {
        const { id, nombre, carrera, semestre, password } = req.body;
        if (!id) return res.json({ success: false, message: "ID no proporcionado" });

        let sql = "UPDATE usuarios SET nombre = ?, carrera = ?, semestre = ?";
        let params = [nombre, carrera, semestre];

        if (password && password.trim() !== '') {
            sql += ", password = ?";
            params.push(password);
        }

        sql += " WHERE id = ?";
        params.push(id);

        db.query(sql, params, (err) => {
            if (err) return res.json({ success: false, message: err.message });
            db.query("SELECT id, nombre, correo, rol, carrera, semestre, codigo_unico, avatar FROM usuarios WHERE id = ?", [id], (err2, rows) => {
                if (err2 || !rows || rows.length === 0) {
                    return res.json({ success: true, message: "Perfil actualizado correctamente" });
                }
                res.json({ success: true, message: "Perfil actualizado correctamente", usuario: rows[0] });
            });
        });
    } else {
        res.status(404).json({ success: false, message: "Acción POST no encontrada" });
    }
});

// Alias ASCII para evitar incompatibilidades de codificación de rutas con "ñ".
app.post(['/api/crear_reseña', '/api/crear_resena'], (req, res) => {
    const { solicitud_id, usuario_id, tipo } = req.body;
    const tipoValido = ['estudiante', 'tutor'].includes(tipo);
    const campos = tipo === 'estudiante'
        ? [Number(req.body.calificacion_asesoria), Number(req.body.calificacion_asesor)]
        : [Number(req.body.calificacion_usuario)];
    const comentarios = tipo === 'estudiante'
        ? [String(req.body.comentario_asesoria || '').trim().slice(0, 1000), String(req.body.comentario_asesor || '').trim().slice(0, 1000)]
        : [String(req.body.comentario_usuario || '').trim().slice(0, 1000)];
    if (!solicitud_id || !usuario_id || !tipoValido || campos.some(n => !Number.isInteger(n) || n < 1 || n > 5)) {
        return res.status(400).json({ success: false, message: 'Elige una calificación de 1 a 5 estrellas para cada elemento.' });
    }

    db.getConnection((errConexion, connection) => {
        if (errConexion) return res.status(500).json({ success: false, message: errConexion.message });
        connection.beginTransaction(errTransaccion => {
            if (errTransaccion) { connection.release(); return res.status(500).json({ success: false, message: errTransaccion.message }); }
            const responderError = (status, message) => connection.rollback(() => { connection.release(); res.status(status).json({ success: false, message }); });
            connection.query(`SELECT s.id, s.asesoria_id, s.estudiante_solicitante_id AS estudiante_id, s.estado_solicitud, a.usuario_id AS asesor_id
                              FROM solicitudes s JOIN asesorias a ON a.id = s.asesoria_id WHERE s.id = ? FOR UPDATE`, [solicitud_id], (errSolicitud, filas) => {
                if (errSolicitud) return responderError(500, errSolicitud.message);
                if (!filas.length || filas[0].estado_solicitud !== 'completada') return responderError(403, 'Las reseñas solo están disponibles después de completar la asesoría.');
                const solicitud = filas[0];
                const esEstudiante = tipo === 'estudiante' && Number(solicitud.estudiante_id) === Number(usuario_id);
                const esTutor = tipo === 'tutor' && Number(solicitud.asesor_id) === Number(usuario_id);
                if (!esEstudiante && !esTutor) return responderError(403, 'Solo las personas que participaron en esta asesoría pueden reseñar.');

                const tipos = tipo === 'estudiante' ? ['asesoria', 'asesor'] : ['usuario'];
                connection.query('SELECT tipo FROM reseñas WHERE solicitud_id = ? AND tipo IN (?)', [solicitud_id, tipos], (errExistentes, previas) => {
                    if (errExistentes) return responderError(500, errExistentes.message);
                    if (previas.length) return responderError(409, 'Ya enviaste tus reseñas para esta asesoría.');
                    const registros = tipo === 'estudiante'
                        ? [
                            ['asesoria', campos[0], comentarios[0], null],
                            ['asesor', campos[1], comentarios[1], solicitud.asesor_id]
                        ]
                        : [['usuario', campos[0], comentarios[0], solicitud.estudiante_id]];
                    const insertarSiguiente = indice => {
                        if (indice >= registros.length) {
                            return connection.commit(errCommit => {
                                if (errCommit) return responderError(500, errCommit.message);
                                connection.release();
                                res.json({ success: true, message: 'Reseñas anónimas guardadas.' });
                            });
                        }
                        const [tipoResena, calificacion, comentario, usuarioEvaluado] = registros[indice];
                        const sql = `INSERT INTO reseñas (asesoria_id, estudiante_id, asesor_id, calificacion, comentario, solicitud_id, revisor_id, usuario_evaluado_id, tipo)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        connection.query(sql, [solicitud.asesoria_id, solicitud.estudiante_id, solicitud.asesor_id, calificacion, comentario, solicitud.id, usuario_id, usuarioEvaluado, tipoResena], errInsert => {
                            if (errInsert) return responderError(500, errInsert.message);
                            insertarSiguiente(indice + 1);
                        });
                    };
                    insertarSiguiente(0);
                });
            });
        });
    });
});

app.get('/api/obtener_reseñas_asesor', (req, res) => {
    const asesor_id = req.query.asesor_id || 0;
    const sql = "SELECT calificacion, comentario, creado_en FROM reseñas WHERE asesor_id = ? AND (tipo = 'asesor' OR solicitud_id IS NULL) ORDER BY creado_en DESC";
    db.query(sql, [asesor_id], (err, results) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, reseñas: results });
    });
});

app.get('/api/obtener_reseñas_asesoria', (req, res) => {
    const asesoria_id = req.query.asesoria_id || 0;
    const sql = `SELECT calificacion, comentario, creado_en,
                        CASE WHEN tipo = 'asesor' THEN 'Asesor' ELSE 'Asesoría' END AS objetivo
                 FROM reseñas WHERE asesoria_id = ? AND (tipo IN ('asesoria','asesor') OR solicitud_id IS NULL)
                 ORDER BY creado_en DESC`;
    db.query(sql, [asesoria_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, reseñas: results || [] });
    });
});

app.get('/api/obtener_reseñas_usuario', (req, res) => {
    const usuario_id = Number(req.query.usuario_id);
    if (!usuario_id) return res.status(400).json({ success: false, message: 'Falta el ID de usuario.' });
    db.query("SELECT calificacion, comentario, creado_en FROM reseñas WHERE usuario_evaluado_id = ? AND tipo = 'usuario' ORDER BY creado_en DESC", [usuario_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const reseñas = results || [];
        const promedio = reseñas.length ? reseñas.reduce((suma, r) => suma + Number(r.calificacion || 0), 0) / reseñas.length : 0;
        res.json({ success: true, promedio, total: reseñas.length, reseñas });
    });
});

app.get('/api/obtener_notificaciones', (req, res) => {
    const usuario_id = Number(req.query.usuario_id);
    if (!usuario_id) return res.status(400).json({ success: false, message: "Falta el ID de usuario", notificaciones: [] });
    db.query("SELECT id, mensaje, creado_en FROM notificaciones WHERE usuario_id = ? AND leido = 0 ORDER BY creado_en DESC LIMIT 50", [usuario_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message, notificaciones: [] });
        res.json({ success: true, notificaciones: results || [] });
    });
});

app.post('/api/marcar_notificaciones_leidas', (req, res) => {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ success: false, message: "Falta el ID de usuario" });
    db.query("UPDATE notificaciones SET leido = 1 WHERE usuario_id = ? AND leido = 0", [usuario_id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// 7. CALENDARIO PERSONAL PRIVADO
// ==========================================
app.get('/api/eventos_calendario', (req, res) => {
    const usuarioId = Number(req.query.usuario_id);
    const desde = String(req.query.desde || '');
    const hasta = String(req.query.hasta || '');
    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!usuarioId || !formatoFecha.test(desde) || !formatoFecha.test(hasta) || desde > hasta) {
        return res.status(400).json({ success: false, message: 'Indica un mes válido.' });
    }
    db.query("SELECT id, titulo, descripcion, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio, TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin FROM calendario_eventos WHERE usuario_id = ? AND fecha BETWEEN ? AND ? ORDER BY fecha, hora_inicio, id", [usuarioId, desde, hasta], (err, eventos) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, eventos: eventos || [] });
    });
});

app.post('/api/eventos_calendario', (req, res) => {
    const { evento_id, usuario_id, titulo, descripcion = '', fecha, hora_inicio, hora_fin = '' } = req.body;
    const usuarioId = Number(usuario_id);
    const fechaTexto = String(fecha || '');
    const horaInicio = String(hora_inicio || '');
    const horaFin = String(hora_fin || '');
    if (!usuarioId || !String(titulo || '').trim() || String(titulo).trim().length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) || !/^\d{2}:\d{2}$/.test(horaInicio) || (horaFin && !/^\d{2}:\d{2}$/.test(horaFin)) || (horaFin && horaFin < horaInicio)) {
        return res.status(400).json({ success: false, message: 'Revisa el título, la fecha y las horas del evento.' });
    }
    const datos = [String(titulo).trim(), String(descripcion).trim() || null, fechaTexto, horaInicio, horaFin || null];
    if (evento_id) {
        db.query('UPDATE calendario_eventos SET titulo = ?, descripcion = ?, fecha = ?, hora_inicio = ?, hora_fin = ? WHERE id = ? AND usuario_id = ?', [...datos, evento_id, usuarioId], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
            res.json({ success: true, message: 'Evento actualizado.' });
        });
    } else {
        db.query('INSERT INTO calendario_eventos (usuario_id, titulo, descripcion, fecha, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?, ?)', [usuarioId, ...datos], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: result.insertId, message: 'Evento agregado al calendario.' });
        });
    }
});

app.post('/api/eliminar_evento_calendario', (req, res) => {
    const usuarioId = Number(req.body.usuario_id);
    const eventoId = Number(req.body.evento_id);
    if (!usuarioId || !eventoId) return res.status(400).json({ success: false, message: 'Evento no válido.' });
    db.query('DELETE FROM calendario_eventos WHERE id = ? AND usuario_id = ?', [eventoId, usuarioId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
        res.json({ success: true, message: 'Evento eliminado.' });
    });
});

app.post('/api/admin_eliminar_registro', (req, res) => {
    const { tabla, id } = req.body;
    const permitidas = ['usuarios', 'asesorias', 'solicitudes', 'materias', 'reseñas', 'mensajes', 'contactos'];
    if (permitidas.includes(tabla)) {
        db.query(`DELETE FROM ${tabla} WHERE id = ?`, [id], (err) => {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: "Registro eliminado correctamente" });
        });
    } else {
        res.json({ success: false, message: "Error: Tabla no permitida" });
    }
});

// Preparar las tablas y columnas nuevas antes de aceptar solicitudes.
inicializarExtensiones((err) => {
    if (err) {
        console.error('No se pudo preparar el calendario y las reseñas:', err.message);
        process.exitCode = 1;
        return;
    }
    app.listen(3000, () => {
        console.log('Servidor Node.js corriendo en http://localhost:3000');
    });
});
