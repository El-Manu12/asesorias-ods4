<?php
// backend/api.php

// Configuración de Cabeceras CORS y JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de Base de Datos
$host = 'localhost';
$db   = 'db_asesorias_sistema';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la Base de Datos: " . $e->getMessage(), "error" => $e->getMessage()]);
    exit();
}

// Obtener la acción solicitada por GET o POST
$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Leer datos JSON en solicitudes POST/PUT
$inputData = json_decode(file_get_contents("php://input"), true);

// Función auxiliar para generar código único aleatorio de 5 dígitos
function generarCodigoUnico($pdo) {
    for ($i = 0; $i < 10; $i++) {
        $codigo = str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE codigo_unico = ?");
        $stmt->execute([$codigo]);
        if (!$stmt->fetch()) {
            return $codigo;
        }
    }
    return rand(10000, 99999);
}

try {
    switch ($action) {

        // ==========================================
        // 1. AUTENTICACIÓN Y USUARIOS
        // ==========================================
        case 'login':
            if ($method === 'POST') {
                $correo = $inputData['correo'] ?? '';
                $password = $inputData['password'] ?? '';

                $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE correo = ? AND password = ?");
                $stmt->execute([$correo, $password]);
                $usuario = $stmt->fetch();

                if ($usuario) {
                    if (empty($usuario['codigo_unico'])) {
                        $nuevoCodigo = generarCodigoUnico($pdo);
                        $stmtUpd = $pdo->prepare("UPDATE usuarios SET codigo_unico = ? WHERE id = ?");
                        $stmtUpd->execute([$nuevoCodigo, $usuario['id']]);
                        $usuario['codigo_unico'] = $nuevoCodigo;
                    }
                    echo json_encode(["success" => true, "message" => "Login exitoso", "usuario" => $usuario]);
                } else {
                    echo json_encode(["success" => false, "message" => "Credenciales incorrectas"]);
                }
            }
            break;

        case 'registro':
            if ($method === 'POST') {
                $nombre = $inputData['nombre'] ?? '';
                $correo = $inputData['correo'] ?? '';
                $password = $inputData['password'] ?? '';
                $carrera = $inputData['carrera'] ?? '';
                $semestre = $inputData['semestre'] ?? null;
                $rol = $inputData['rol'] ?? 'estudiante';

                $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ?");
                $stmtCheck->execute([$correo]);
                if ($stmtCheck->fetch()) {
                    echo json_encode(["success" => false, "message" => "El correo ya está registrado"]);
                    break;
                }

                $codigoUnico = generarCodigoUnico($pdo);
                $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol, carrera, semestre, codigo_unico) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$nombre, $correo, $password, $rol, $carrera, $semestre, $codigoUnico]);
                
                echo json_encode(["success" => true, "message" => "Usuario registrado correctamente", "id" => $pdo->lastInsertId(), "codigo_unico" => $codigoUnico]);
            }
            break;

        case 'obtener_mi_codigo':
            if ($method === 'GET') {
                $usuario_id = $_GET['usuario_id'] ?? 0;
                $stmt = $pdo->prepare("SELECT codigo_unico FROM usuarios WHERE id = ?");
                $stmt->execute([$usuario_id]);
                $row = $stmt->fetch();
                if ($row && !empty($row['codigo_unico'])) {
                    echo json_encode(["success" => true, "codigo_unico" => $row['codigo_unico']]);
                } else {
                    $nuevoCodigo = generarCodigoUnico($pdo);
                    $stmtUpd = $pdo->prepare("UPDATE usuarios SET codigo_unico = ? WHERE id = ?");
                    $stmtUpd->execute([$nuevoCodigo, $usuario_id]);
                    echo json_encode(["success" => true, "codigo_unico" => $nuevoCodigo]);
                }
            }
            break;

        case 'obtener_usuarios':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT id, nombre, correo, rol, carrera, semestre, codigo_unico FROM usuarios");
                echo json_encode(["success" => true, "usuarios" => $stmt->fetchAll()]);
            }
            break;

        // ==========================================
        // 2. ASESORÍAS (OBTENER MATERIAS)
        // ==========================================
        case 'obtener_materias':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM materias");
                echo json_encode(["success" => true, "materias" => $stmt->fetchAll()]);
            }
            break;

        // ==========================================
        // 3. SOLICITUDES E INSCRIPCIONES
        // ==========================================
        case 'solicitar_asesoria':
            if ($method === 'POST') {
                $asesoria_id = $inputData['asesoria_id'] ?? 0;
                $estudiante_id = $inputData['estudiante_id'] ?? 0;
                $mensaje = $inputData['mensaje'] ?? 'Hola, me interesa tu asesoría.';

                try {
                    $stmt = $pdo->prepare("INSERT INTO solicitudes (asesoria_id, estudiante_id, mensaje, estado) VALUES (?, ?, ?, 'pendiente')");
                    $stmt->execute([$asesoria_id, $estudiante_id, $mensaje]);
                } catch (Exception $ex) {
                    try {
                        $stmt = $pdo->prepare("INSERT INTO solicitudes (asesoria_id, usuario_id, mensaje, estado) VALUES (?, ?, ?, 'pendiente')");
                        $stmt->execute([$asesoria_id, $estudiante_id, $mensaje]);
                    } catch (Exception $ex2) {
                        $stmt = $pdo->prepare("INSERT INTO solicitudes (asesoria_id, estudiante_id, estado) VALUES (?, ?, 'pendiente')");
                        $stmt->execute([$asesoria_id, $estudiante_id]);
                    }
                }

                echo json_encode(["success" => true, "message" => "Solicitud enviada correctamente"]);
            }
            break;

        case 'obtener_solicitudes':
            if ($method === 'GET') {
                $usuario_id = $_GET['usuario_id'] ?? 0;

                // Solicitudes recibidas en mis asesorías publicadas
                $sqlRecibidas = "SELECT s.*, a.titulo_tema AS asesoria_titulo, u.nombre AS estudiante_nombre, u.correo AS estudiante_correo
                                 FROM solicitudes s
                                 JOIN asesorias a ON s.asesoria_id = a.id
                                 LEFT JOIN usuarios u ON (s.estudiante_id = u.id OR s.usuario_id = u.id)
                                 WHERE a.usuario_id = ?";
                $stmtRec = $pdo->prepare($sqlRecibidas);
                $stmtRec->execute([$usuario_id]);
                $recibidas = $stmtRec->fetchAll();

                // Solicitudes hechas por mí como estudiante
                $sqlHechas = "SELECT s.*, a.titulo_tema AS asesoria_titulo, t.nombre AS tutor_nombre
                              FROM solicitudes s
                              JOIN asesorias a ON s.asesoria_id = a.id
                              JOIN usuarios t ON a.usuario_id = t.id
                              WHERE s.estudiante_id = ? OR s.usuario_id = ?";
                $stmtHec = $pdo->prepare($sqlHechas);
                $stmtHec->execute([$usuario_id, $usuario_id]);
                $hechas = $stmtHec->fetchAll();

                echo json_encode([
                    "success" => true,
                    "recibidas" => $recibidas,
                    "hechas" => $hechas
                ]);
            }
            break;

        case 'actualizar_estado_solicitud':
            if ($method === 'POST') {
                $solicitud_id = $inputData['solicitud_id'] ?? 0;
                $estado = $inputData['estado'] ?? 'pendiente';

                $stmt = $pdo->prepare("UPDATE solicitudes SET estado = ? WHERE id = ?");
                $stmt->execute([$estado, $solicitud_id]);

                if ($estado === 'aceptada') {
                    $stmtInfo = $pdo->prepare("
                        SELECT COALESCE(s.estudiante_id, s.usuario_id) AS estudiante_id, a.usuario_id AS tutor_id 
                        FROM solicitudes s 
                        JOIN asesorias a ON s.asesoria_id = a.id 
                        WHERE s.id = ?
                    ");
                    $stmtInfo->execute([$solicitud_id]);
                    $solInfo = $stmtInfo->fetch();

                    if ($solInfo && !empty($solInfo['estudiante_id'])) {
                        $est_id = $solInfo['estudiante_id'];
                        $tut_id = $solInfo['tutor_id'];

                        $chk1 = $pdo->prepare("SELECT id FROM contactos WHERE usuario_id = ? AND contacto_id = ?");
                        $chk1->execute([$est_id, $tut_id]);
                        if (!$chk1->fetch()) {
                            $pdo->prepare("INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) VALUES (?, ?, 'Tutor')")->execute([$est_id, $tut_id]);
                        }

                        $chk2 = $pdo->prepare("SELECT id FROM contactos WHERE usuario_id = ? AND contacto_id = ?");
                        $chk2->execute([$tut_id, $est_id]);
                        if (!$chk2->fetch()) {
                            $pdo->prepare("INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) VALUES (?, ?, 'Estudiante')")->execute([$tut_id, $est_id]);
                        }
                    }
                }

                echo json_encode(["success" => true, "message" => "Estado actualizado"]);
            }
            break;

        // ==========================================
        // 4. MÓDULO DE CONTACTOS Y APODOS
        // ==========================================
        case 'obtener_contactos':
            if ($method === 'GET') {
                $usuario_id = $_GET['usuario_id'] ?? 0;
                $stmt = $pdo->prepare("
                    SELECT u.id, u.nombre, u.correo, u.codigo_unico, u.carrera, u.semestre, c.apodo_personalizado 
                    FROM contactos c
                    JOIN usuarios u ON c.contacto_id = u.id
                    WHERE c.usuario_id = ?
                ");
                $stmt->execute([$usuario_id]);
                echo json_encode(["success" => true, "contactos" => $stmt->fetchAll()]);
            }
            break;

        case 'agregar_contacto':
            if ($method === 'POST') {
                $usuario_id = $inputData['usuario_id'] ?? 0;
                $termino = trim($inputData['termino'] ?? '');
                $apodo = trim($inputData['apodo'] ?? '');

                if ($usuario_id == 0 || empty($termino)) {
                    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
                    break;
                }

                $stmtBuscar = $pdo->prepare("SELECT id FROM usuarios WHERE codigo_unico = ? OR correo = ? OR id = ?");
                $stmtBuscar->execute([$termino, $termino, $termino]);
                $contactoEncontrado = $stmtBuscar->fetch();

                if (!$contactoEncontrado) {
                    echo json_encode(["success" => false, "message" => "Usuario no encontrado con ese Código ID o Correo"]);
                    break;
                }

                $contacto_id = $contactoEncontrado['id'];
                if ($usuario_id == $contacto_id) {
                    echo json_encode(["success" => false, "message" => "No te puedes agregar a ti mismo"]);
                    break;
                }

                $stmtCheck = $pdo->prepare("SELECT id FROM contactos WHERE usuario_id = ? AND contacto_id = ?");
                $stmtCheck->execute([$usuario_id, $contacto_id]);
                if ($stmtCheck->fetch()) {
                    echo json_encode(["success" => false, "message" => "Este usuario ya está en tus contactos"]);
                    break;
                }

                $stmtIns = $pdo->prepare("INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) VALUES (?, ?, ?)");
                $stmtIns->execute([$usuario_id, $contacto_id, empty($apodo) ? null : $apodo]);

                echo json_encode(["success" => true, "message" => "¡Contacto agregado con éxito!"]);
            }
            break;

        case 'actualizar_apodo':
            if ($method === 'POST') {
                $usuario_id = $inputData['usuario_id'] ?? 0;
                $contacto_id = $inputData['contacto_id'] ?? 0;
                $apodo = trim($inputData['apodo'] ?? '');

                $stmtCheck = $pdo->prepare("SELECT id FROM contactos WHERE usuario_id = ? AND contacto_id = ?");
                $stmtCheck->execute([$usuario_id, $contacto_id]);
                if ($stmtCheck->fetch()) {
                    $pdo->prepare("UPDATE contactos SET apodo_personalizado = ? WHERE usuario_id = ? AND contacto_id = ?")->execute([empty($apodo) ? null : $apodo, $usuario_id, $contacto_id]);
                } else {
                    $pdo->prepare("INSERT INTO contactos (usuario_id, contacto_id, apodo_personalizado) VALUES (?, ?, ?)")->execute([$usuario_id, $contacto_id, empty($apodo) ? null : $apodo]);
                }

                echo json_encode(["success" => true, "message" => "Apodo actualizado"]);
            }
            break;

        // ==========================================
        // 5. MÓDULO DE MENSAJERÍA Y CHAT
        // ==========================================
        case 'enviar_mensaje_chat':
            if ($method === 'POST') {
                $remitente_id = $inputData['remitente_id'] ?? 0;
                $destinatario_id = $inputData['destinatario_id'] ?? 0;
                $mensaje = trim($inputData['mensaje'] ?? '');

                if ($remitente_id == 0 || $destinatario_id == 0 || empty($mensaje)) {
                    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
                    break;
                }

                $pdo->prepare("INSERT INTO mensajes (remitente_id, destinatario_id, mensaje) VALUES (?, ?, ?)")->execute([$remitente_id, $destinatario_id, $mensaje]);
                echo json_encode(["success" => true, "message" => "Enviado"]);
            }
            break;

        case 'obtener_mensajes_chat':
            if ($method === 'GET') {
                $user1 = $_GET['user1'] ?? 0;
                $user2 = $_GET['user2'] ?? 0;
                $stmt = $pdo->prepare("SELECT * FROM mensajes WHERE (remitente_id = ? AND destinatario_id = ?) OR (remitente_id = ? AND destinatario_id = ?) ORDER BY id ASC");
                $stmt->execute([$user1, $user2, $user2, $user1]);
                echo json_encode(["success" => true, "mensajes" => $stmt->fetchAll()]);
            }
            break;

        case 'enviar_mensaje':
            if ($method === 'POST') {
                $remitente_id = $inputData['remitente_id'] ?? 0;
                $destinatario_id = $inputData['destinatario_id'] ?? 0;
                $asesoria_id = $inputData['asesoria_id'] ?? null;
                $mensaje = $inputData['mensaje'] ?? '';

                $stmt = $pdo->prepare("INSERT INTO mensajes (remitente_id, destinatario_id, asesoria_id, mensaje) VALUES (?, ?, ?, ?)");
                $stmt->execute([$remitente_id, $destinatario_id, $asesoria_id, $mensaje]);

                echo json_encode(["success" => true, "message" => "Mensaje enviado"]);
            }
            break;

        case 'obtener_mensajes':
            if ($method === 'GET') {
                $user1 = $_GET['user1'] ?? 0;
                $user2 = $_GET['user2'] ?? 0;

                $stmt = $pdo->prepare("SELECT * FROM mensajes WHERE (remitente_id = ? AND destinatario_id = ?) OR (remitente_id = ? AND destinatario_id = ?) ORDER BY fecha_envio ASC");
                $stmt->execute([$user1, $user2, $user2, $user1]);

                echo json_encode(["success" => true, "mensajes" => $stmt->fetchAll()]);
            }
            break;

        case 'buscar_usuario_por_contacto':
            if ($method === 'GET') {
                $termino = $_GET['termino'] ?? '';
                $stmt = $pdo->prepare("SELECT id, nombre, correo, carrera, semestre, rol, codigo_unico FROM usuarios WHERE correo = ? OR id = ? OR codigo_unico = ?");
                $stmt->execute([$termino, $termino, $termino]);
                $usuario = $stmt->fetch();

                if ($usuario) {
                    echo json_encode(["success" => true, "usuario" => $usuario]);
                } else {
                    echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
                }
            }
            break;

        // ==========================================
        // 6. SISTEMA DE RESEÑAS Y VALORACIONES
        // ==========================================
        case 'crear_reseña':
            if ($method === 'POST') {
                $asesoria_id = $inputData['asesoria_id'] ?? 0;
                $estudiante_id = $inputData['estudiante_id'] ?? 0;
                $asesor_id = $inputData['asesor_id'] ?? 0;
                $calificacion = $inputData['calificacion'] ?? 5;
                $comentario = $inputData['comentario'] ?? '';

                $stmt = $pdo->prepare("INSERT INTO evaluaciones (asesoria_id, estudiante_id, asesor_id, calificacion, comentario) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$asesoria_id, $estudiante_id, $asesor_id, $calificacion, $comentario]);

                echo json_encode(["success" => true, "message" => "Reseña guardada exitosamente"]);
            }
            break;

        case 'obtener_reseñas_asesor':
            if ($method === 'GET') {
                $asesor_id = $_GET['asesor_id'] ?? 0;
                $stmt = $pdo->prepare("SELECT e.*, u.nombre AS estudiante_nombre FROM evaluaciones e JOIN usuarios u ON e.estudiante_id = u.id WHERE e.asesor_id = ? ORDER BY e.id DESC");
                $stmt->execute([$asesor_id]);
                echo json_encode(["success" => true, "reseñas" => $stmt->fetchAll()]);
            }
            break;

        // ==========================================
        // 7. PANEL DE ADMINISTRACIÓN (CRUD TOTAL)
        // ==========================================
        case 'admin_eliminar_registro':
            if ($method === 'POST') {
                $tabla = $inputData['tabla'] ?? '';
                $id = $inputData['id'] ?? 0;

                $tablas_permitidas = ['usuarios', 'asesorias', 'solicitudes', 'materias', 'evaluaciones', 'mensajes', 'contactos'];
                if (in_array($tabla, $tablas_permitidas)) {
                    $stmt = $pdo->prepare("DELETE FROM $tabla WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode(["success" => true, "message" => "Registro eliminado correctamente"]);
                } else {
                    echo json_encode(["success" => false, "message" => "Tabla no permitida"]);
                }
            }
            break;

        // ==========================================
        // 8. GUARDAR / PUBLICAR / EDITAR ASESORÍA
        // ==========================================
        case 'save_asesoria':
            if ($method === 'POST') {
                $id = $inputData['id'] ?? '';
                $usuario_id = $inputData['usuario_id'] ?? 0;
                $materia_input = trim($inputData['materia'] ?? '1'); 
                $titulo = trim($inputData['titulo_tema'] ?? '');
                $descripcion = trim($inputData['descripcion'] ?? '');
                $modalidad = trim($inputData['modalidad'] ?? 'Virtual');
                
                $h_ini_p = !empty($inputData['hora_inicio_presencial']) ? $inputData['hora_inicio_presencial'] : null;
                $h_fin_p = !empty($inputData['hora_fin_presencial']) ? $inputData['hora_fin_presencial'] : null;
                $lugares_p = trim($inputData['lugares_presencial'] ?? '');
                
                $h_ini_d = !empty($inputData['hora_inicio_digital']) ? $inputData['hora_inicio_digital'] : null;
                $h_fin_d = !empty($inputData['hora_fin_digital']) ? $inputData['hora_fin_digital'] : null;
                $plataformas_d = trim($inputData['plataformas_digital'] ?? '');
                
                $dias_semana = trim($inputData['dias_semana'] ?? '');

                $materia_id = 1;
                if (!empty($materia_input)) {
                    if (is_numeric($materia_input)) {
                        $materia_id = intval($materia_input);
                    } else {
                        try {
                            $colStmt = $pdo->query("SHOW COLUMNS FROM materias");
                            $columns = $colStmt->fetchAll(PDO::FETCH_COLUMN);
                            $textCol = 'nombre';
                            foreach (['nombre', 'nombre_materia', 'titulo', 'descripcion'] as $candidate) {
                                if (in_array($candidate, $columns)) {
                                    $textCol = $candidate;
                                    break;
                                }
                            }

                            $stmtMat = $pdo->prepare("SELECT id FROM materias WHERE `$textCol` = ?");
                            $stmtMat->execute([$materia_input]);
                            $matRow = $stmtMat->fetch();
                            if ($matRow) {
                                $materia_id = $matRow['id'];
                            } else {
                                $stmtInsMat = $pdo->prepare("INSERT INTO materias (`$textCol`) VALUES (?)");
                                $stmtInsMat->execute([$materia_input]);
                                $materia_id = $pdo->lastInsertId();
                            }
                        } catch (Exception $ex) {
                            $materia_id = 1;
                        }
                    }
                }

                if (!empty($id)) {
                    $stmt = $pdo->prepare("UPDATE asesorias SET materia_id = ?, titulo_tema = ?, descripcion = ?, modalidad = ?, hora_inicio_presencial = ?, hora_fin_presencial = ?, lugares_presencial = ?, hora_inicio_digital = ?, hora_fin_digital = ?, plataformas_digital = ?, dias_semana = ? WHERE id = ? AND usuario_id = ?");
                    $stmt->execute([
                        $materia_id, $titulo, $descripcion, $modalidad,
                        $h_ini_p, $h_fin_p, $lugares_p,
                        $h_ini_d, $h_fin_d, $plataformas_d, $dias_semana,
                        $id, $usuario_id
                    ]);
                    echo json_encode(["success" => true, "message" => "Asesoría actualizada correctamente"]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO asesorias (usuario_id, materia_id, titulo_tema, descripcion, modalidad, hora_inicio_presencial, hora_fin_presencial, lugares_presencial, hora_inicio_digital, hora_fin_digital, plataformas_digital, dias_semana) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([
                        $usuario_id, $materia_id, $titulo, $descripcion, $modalidad,
                        $h_ini_p, $h_fin_p, $lugares_p,
                        $h_ini_d, $h_fin_d, $plataformas_d, $dias_semana
                    ]);
                    echo json_encode(["success" => true, "message" => "Asesoría publicada correctamente"]);
                }
            }
            break;

        // ==========================================
        // 9. OBTENER ASESORÍAS Y BÚSQUEDA MULTICAMPO
        // ==========================================
        case 'get_asesorias':
            if ($method === 'GET') {
                $search = $_GET['search'] ?? '';
                try {
                    $colStmt = $pdo->query("SHOW COLUMNS FROM materias");
                    $columns = $colStmt->fetchAll(PDO::FETCH_COLUMN);
                    $textCol = 'nombre';
                    foreach (['nombre', 'nombre_materia', 'titulo', 'descripcion'] as $candidate) {
                        if (in_array($candidate, $columns)) {
                            $textCol = $candidate;
                            break;
                        }
                    }

                    $colAses = $pdo->query("SHOW COLUMNS FROM asesorias");
                    $colsAsesoria = $colAses->fetchAll(PDO::FETCH_COLUMN);
                    $tituloCol = in_array('titulo_tema', $colsAsesoria) ? 'titulo_tema' : 'titulo';

                    if (!empty($search)) {
                        $searchTerm = "%$search%";
                        $stmt = $pdo->prepare("SELECT a.*, u.nombre AS tutor_nombre, u.carrera, u.semestre, m.`$textCol` AS materia 
                            FROM asesorias a 
                            JOIN usuarios u ON a.usuario_id = u.id 
                            LEFT JOIN materias m ON a.materia_id = m.id 
                            WHERE a.`$tituloCol` LIKE ? OR a.descripcion LIKE ? OR m.`$textCol` LIKE ? OR u.nombre LIKE ? 
                            ORDER BY a.id DESC");
                        $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
                    } else {
                        $stmt = $pdo->query("SELECT a.*, u.nombre AS tutor_nombre, u.carrera, u.semestre, m.`$textCol` AS materia 
                            FROM asesorias a 
                            JOIN usuarios u ON a.usuario_id = u.id 
                            LEFT JOIN materias m ON a.materia_id = m.id 
                            ORDER BY a.id DESC");
                    }
                    echo json_encode($stmt->fetchAll());
                } catch (Exception $e) {
                    if (!empty($search)) {
                        $searchTerm = "%$search%";
                        $stmt = $pdo->prepare("SELECT a.*, u.nombre AS tutor_nombre, u.carrera, u.semestre 
                            FROM asesorias a 
                            JOIN usuarios u ON a.usuario_id = u.id 
                            WHERE a.descripcion LIKE ? OR u.nombre LIKE ? 
                            ORDER BY a.id DESC");
                        $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
                    } else {
                        $stmt = $pdo->query("SELECT a.*, u.nombre AS tutor_nombre, u.carrera, u.semestre FROM asesorias a JOIN usuarios u ON a.usuario_id = u.id ORDER BY a.id DESC");
                    }
                    echo json_encode($stmt->fetchAll());
                }
            }
            break;

        default:
            echo json_encode(["success" => false, "message" => "Acción no válida: " . $action, "error" => "Acción no válida"]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error en el servidor: " . $e->getMessage(), "error" => $e->getMessage()]);
}
?>