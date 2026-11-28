-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 17-11-2026 a las 05:46:29
-- Versión del servidor: 10.4.24-MariaDB
-- Versión de PHP: 7.4.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `db_asesorias_sistema`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asesorias`
--

CREATE TABLE `asesorias` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `titulo_tema` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `modalidad` enum('virtual','presencial','híbrida') DEFAULT 'virtual',
  `estado` enum('activa','pausada','finalizada') DEFAULT 'activa',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `materia` varchar(100) DEFAULT 'General',
  `hora_inicio` time DEFAULT '08:00:00',
  `hora_fin` time DEFAULT '10:00:00',
  `dias_semana` varchar(100) DEFAULT 'Lunes a Viernes',
  `hora_inicio_presencial` time DEFAULT '08:00:00',
  `hora_fin_presencial` time DEFAULT '10:00:00',
  `lugares_presencial` varchar(255) DEFAULT NULL,
  `lugar_presencial` varchar(150) DEFAULT '',
  `hora_inicio_digital` time DEFAULT '16:00:00',
  `hora_fin_digital` time DEFAULT '18:00:00',
  `plataformas_digital` varchar(255) DEFAULT NULL,
  `plataforma_digital` varchar(100) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `asesorias`
--

INSERT INTO `asesorias` (`id`, `usuario_id`, `materia_id`, `titulo_tema`, `descripcion`, `modalidad`, `estado`, `creado_en`, `materia`, `hora_inicio`, `hora_fin`, `dias_semana`, `hora_inicio_presencial`, `hora_fin_presencial`, `lugares_presencial`, `lugar_presencial`, `hora_inicio_digital`, `hora_fin_digital`, `plataformas_digital`, `plataforma_digital`) VALUES
(1, 1, 1, 'JavaScript Moderno y DOM', 'Te ayudo a entender eventos, asincronía y manipulación del DOM.', 'virtual', 'activa', '2026-11-06 03:51:53', 'Programación Web', '08:00:00', '10:00:00', 'Lunes a Viernes', '08:00:00', '10:00:00', NULL, '', '16:00:00', '18:00:00', NULL, ''),
(2, 2, 2, 'Espacios Vectoriales', 'Repaso enfocado en ejercicios prácticos para exámenes parciales.', 'presencial', 'activa', '2026-11-06 03:51:53', 'Álgebra Lineal', '08:00:00', '10:00:00', 'Lunes a Viernes', '08:00:00', '10:00:00', NULL, '', '16:00:00', '18:00:00', NULL, ''),
(3, 1, 7, 'Matematicas', 'Aprende sobre sumas de forma simple\n', 'virtual', 'activa', '2026-11-06 03:58:44', 'Matemáticas', '08:00:00', '10:00:00', 'Lunes a Viernes', '08:00:00', '10:00:00', NULL, '', '16:00:00', '18:00:00', NULL, ''),
(4, 1, 7, 'Matematicas', 'Aprende a sumar rapido', 'híbrida', 'activa', '2026-11-06 04:57:17', 'Matemáticas', '08:00:00', '10:00:00', 'Lunes a Viernes', '08:00:00', '10:00:00', 'Biblioteca, Salon A4 y Fueras de la Universidad', '', '16:00:00', '18:00:00', 'Zoom y Discord', ''),
(5, 1, 7, 'Matematicas', 'Aprende a sumar\n', 'virtual', 'activa', '2026-11-06 04:58:56', 'Matemáticas', '08:00:00', '10:00:00', 'Lunes a Viernes', '08:00:00', '10:00:00', NULL, '', '16:00:00', '18:00:00', NULL, ''),
(6, 1, 7, 'Matematicas', '1', 'presencial', 'activa', '2026-11-06 05:33:58', 'Matemáticas', '11:11:00', '23:12:00', 'Lunes a Viernes', '08:00:00', '10:00:00', NULL, '', '16:00:00', '18:00:00', NULL, ''),
(8, 1, 3, 'no saber hablar', 'a', 'híbrida', 'activa', '2026-11-09 04:22:28', 'Español', '08:00:00', '10:00:00', 'De Lunes a Jueves', '11:25:00', '15:23:00', 'Biblioteca, Salon A4 y Fueras de la Universidad', '', '15:26:00', '16:27:00', 'Zoom y Discord', ''),
(9, 1, 6, 'Rvolucion', 'Variedad', 'presencial', 'activa', '2026-11-16 06:18:47', 'Historia', '08:00:00', '10:00:00', 'Lunes a Jueves', '02:10:00', '03:12:00', 'Biblioteca, Salon A4 y Fueras de la Universidad', '', NULL, NULL, NULL, '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calendario_eventos`
--

CREATE TABLE `calendario_eventos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(120) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `calendario_eventos`
--

INSERT INTO `calendario_eventos` (`id`, `usuario_id`, `titulo`, `descripcion`, `fecha`, `hora_inicio`, `hora_fin`, `creado_en`) VALUES
(1, 3, 'Repaso', 'Mate', '2026-11-16', '09:00:00', '10:00:00', '2026-11-17 04:24:21');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contactos`
--

CREATE TABLE `contactos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `contacto_id` int(11) NOT NULL,
  `estado` varchar(20) DEFAULT 'aceptado',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `apodo_personalizado` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `contactos`
--

INSERT INTO `contactos` (`id`, `usuario_id`, `contacto_id`, `estado`, `fecha_creacion`, `apodo_personalizado`) VALUES
(1, 3, 1, 'aceptado', '2026-11-09 05:55:26', 'Asesor de Español/Mate'),
(2, 1, 3, 'aceptado', '2026-11-09 05:59:48', 'admin');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `evaluaciones`
--

CREATE TABLE `evaluaciones` (
  `id` int(11) NOT NULL,
  `solicitud_id` int(11) NOT NULL,
  `calificacion` int(11) DEFAULT NULL CHECK (`calificacion` between 1 and 5),
  `comentario` text DEFAULT NULL,
  `fecha_evaluacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horarios`
--

CREATE TABLE `horarios` (
  `id` int(11) NOT NULL,
  `asesoria_id` int(11) NOT NULL,
  `dia_semana` varchar(20) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `horarios`
--

INSERT INTO `horarios` (`id`, `asesoria_id`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(1, 1, 'Lunes', '15:00:00', '17:00:00'),
(2, 2, 'Viernes', '11:00:00', '13:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materias`
--

CREATE TABLE `materias` (
  `id` int(11) NOT NULL,
  `nombre_materia` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `materias`
--

INSERT INTO `materias` (`id`, `nombre_materia`, `descripcion`) VALUES
(1, 'Programación Web', 'Desarrollo frontend y backend con arquitecturas modernas.'),
(2, 'Álgebra Lineal', 'Matrices, espacios vectoriales y transformaciones lineales.'),
(3, 'Español', NULL),
(4, '', 'Historia'),
(5, '', 'General'),
(6, 'Historia', NULL),
(7, 'Matemáticas', 'Aritmética, cálculo y fundamentos matemáticos.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes`
--

CREATE TABLE `mensajes` (
  `id` int(11) NOT NULL,
  `remitente_id` int(11) NOT NULL,
  `destinatario_id` int(11) NOT NULL,
  `asesoria_id` int(11) DEFAULT NULL,
  `mensaje` text NOT NULL,
  `leido` tinyint(1) DEFAULT 0,
  `fecha_envio` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `mensajes`
--

INSERT INTO `mensajes` (`id`, `remitente_id`, `destinatario_id`, `asesoria_id`, `mensaje`, `leido`, `fecha_envio`) VALUES
(1, 1, 3, NULL, 'oa', 1, '2026-11-09 06:07:34'),
(2, 1, 3, NULL, 'adawrgthyjuiop', 1, '2026-11-10 00:34:23'),
(3, 1, 3, NULL, 'kjbvcxz', 1, '2026-11-10 00:34:24'),
(4, 3, 1, NULL, 'aaaaaaaaaaa', 0, '2026-11-17 03:36:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_chat`
--

CREATE TABLE `mensajes_chat` (
  `id` int(11) NOT NULL,
  `remitente_id` int(11) NOT NULL,
  `destinatario_id` int(11) NOT NULL,
  `mensaje` text NOT NULL,
  `leido` tinyint(1) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `mensaje` text NOT NULL,
  `leido` tinyint(1) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `notificaciones`
--

INSERT INTO `notificaciones` (`id`, `usuario_id`, `mensaje`, `leido`, `creado_en`) VALUES
(1, 3, 'Tu solicitud para “Rvolucion” fue aceptada.', 1, '2026-11-17 03:33:10'),
(2, 1, 'Nuevo mensaje de Admin Sistema.', 1, '2026-11-17 03:36:05'),
(3, 1, 'Nueva solicitud de asesoría para “JavaScript Moderno y DOM”.', 1, '2026-11-17 04:38:28'),
(4, 3, 'Tu solicitud para “JavaScript Moderno y DOM” fue aceptada.', 1, '2026-11-17 04:39:21'),
(5, 3, 'La asesoría “JavaScript Moderno y DOM” se marcó como completada. Ya puedes dejar tu reseña.', 1, '2026-11-17 04:39:49');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reseñas`
--

CREATE TABLE `reseñas` (
  `id` int(11) NOT NULL,
  `asesoria_id` int(11) NOT NULL,
  `estudiante_id` int(11) NOT NULL,
  `asesor_id` int(11) NOT NULL,
  `calificacion` int(11) DEFAULT NULL CHECK (`calificacion` >= 1 and `calificacion` <= 5),
  `comentario` text NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `solicitud_id` int(11) DEFAULT NULL,
  `revisor_id` int(11) DEFAULT NULL,
  `usuario_evaluado_id` int(11) DEFAULT NULL,
  `tipo` enum('asesoria','asesor','usuario') NOT NULL DEFAULT 'asesoria'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `reseñas`
--

INSERT INTO `reseñas` (`id`, `asesoria_id`, `estudiante_id`, `asesor_id`, `calificacion`, `comentario`, `creado_en`, `solicitud_id`, `revisor_id`, `usuario_evaluado_id`, `tipo`) VALUES
(1, 1, 3, 1, 5, '', '2026-11-17 04:43:15', 8, 1, 3, 'usuario'),
(2, 1, 3, 1, 5, '', '2026-11-17 04:44:10', 8, 3, NULL, 'asesoria'),
(3, 1, 3, 1, 5, '', '2026-11-17 04:44:10', 8, 3, 1, 'asesor');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes`
--

CREATE TABLE `solicitudes` (
  `id` int(11) NOT NULL,
  `asesoria_id` int(11) NOT NULL,
  `estudiante_solicitante_id` int(11) NOT NULL,
  `comentario_detallado` text DEFAULT NULL,
  `estado_solicitud` enum('pendiente','aceptada','rechazada','completada') DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp(),
  `estudiante_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `mensaje` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `solicitudes`
--

INSERT INTO `solicitudes` (`id`, `asesoria_id`, `estudiante_solicitante_id`, `comentario_detallado`, `estado_solicitud`, `fecha_solicitud`, `estudiante_id`, `usuario_id`, `mensaje`) VALUES
(1, 3, 1, 'Hola, me interesa esta asesoría.', 'aceptada', '2026-11-06 04:12:27', NULL, NULL, NULL),
(2, 2, 1, 'Hola, me interesa tu asesoría.', 'pendiente', '2026-11-06 06:00:16', NULL, NULL, NULL),
(3, 9, 3, NULL, 'pendiente', '2026-11-16 06:32:34', NULL, NULL, 'Hola, me interesa tu asesoría.'),
(4, 6, 3, NULL, 'pendiente', '2026-11-16 06:32:39', NULL, NULL, 'Hola, me interesa tu asesoría.'),
(5, 2, 1, NULL, 'pendiente', '2026-11-16 06:35:38', NULL, NULL, 'Hola, me interesa tu asesoría.'),
(6, 2, 1, NULL, 'pendiente', '2026-11-16 06:38:00', NULL, NULL, 'Hola, me interesa tu asesoría. pls'),
(7, 9, 3, NULL, 'aceptada', '2026-11-16 06:38:46', NULL, NULL, 'Hola, me interesa tu asesoría. a'),
(8, 1, 3, NULL, 'completada', '2026-11-17 04:38:28', NULL, NULL, 'Hola, me interesa tu asesoría.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('estudiante','admin','directivo') DEFAULT 'estudiante',
  `carrera` varchar(100) DEFAULT NULL,
  `semestre` int(11) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `codigo_unico` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `password`, `rol`, `carrera`, `semestre`, `avatar`, `creado_en`, `codigo_unico`) VALUES
(1, 'Carlos Pérez', 'carlos@univer.edu.mx', '1234', 'estudiante', 'TI', NULL, NULL, '2026-11-06 03:51:53', '88978'),
(2, 'Sofía Hernández', 'sofia@univer.edu.mx', '1234', 'estudiante', NULL, NULL, NULL, '2026-11-06 03:51:53', NULL),
(3, 'Admin Sistema', 'admin@univer.edu.mx', '1234', 'estudiante', NULL, NULL, NULL, '2026-11-06 03:51:53', '42085');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `asesorias`
--
ALTER TABLE `asesorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `materia_id` (`materia_id`);

--
-- Indices de la tabla `calendario_eventos`
--
ALTER TABLE `calendario_eventos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_calendario_usuario_fecha` (`usuario_id`,`fecha`);

--
-- Indices de la tabla `contactos`
--
ALTER TABLE `contactos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `contacto_id` (`contacto_id`);

--
-- Indices de la tabla `evaluaciones`
--
ALTER TABLE `evaluaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `solicitud_id` (`solicitud_id`);

--
-- Indices de la tabla `horarios`
--
ALTER TABLE `horarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `asesoria_id` (`asesoria_id`);

--
-- Indices de la tabla `materias`
--
ALTER TABLE `materias`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `mensajes`
--
ALTER TABLE `mensajes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `remitente_id` (`remitente_id`),
  ADD KEY `destinatario_id` (`destinatario_id`),
  ADD KEY `asesoria_id` (`asesoria_id`);

--
-- Indices de la tabla `mensajes_chat`
--
ALTER TABLE `mensajes_chat`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `reseñas`
--
ALTER TABLE `reseñas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_resena_solicitud_tipo` (`solicitud_id`,`tipo`);

--
-- Indices de la tabla `solicitudes`
--
ALTER TABLE `solicitudes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `asesoria_id` (`asesoria_id`),
  ADD KEY `estudiante_solicitante_id` (`estudiante_solicitante_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD UNIQUE KEY `codigo_unico` (`codigo_unico`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `asesorias`
--
ALTER TABLE `asesorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `calendario_eventos`
--
ALTER TABLE `calendario_eventos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `contactos`
--
ALTER TABLE `contactos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `evaluaciones`
--
ALTER TABLE `evaluaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `horarios`
--
ALTER TABLE `horarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `materias`
--
ALTER TABLE `materias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `mensajes`
--
ALTER TABLE `mensajes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `mensajes_chat`
--
ALTER TABLE `mensajes_chat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `reseñas`
--
ALTER TABLE `reseñas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `solicitudes`
--
ALTER TABLE `solicitudes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asesorias`
--
ALTER TABLE `asesorias`
  ADD CONSTRAINT `asesorias_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `asesorias_ibfk_2` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `calendario_eventos`
--
ALTER TABLE `calendario_eventos`
  ADD CONSTRAINT `calendario_eventos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `contactos`
--
ALTER TABLE `contactos`
  ADD CONSTRAINT `contactos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `contactos_ibfk_2` FOREIGN KEY (`contacto_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `evaluaciones`
--
ALTER TABLE `evaluaciones`
  ADD CONSTRAINT `evaluaciones_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `horarios`
--
ALTER TABLE `horarios`
  ADD CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`asesoria_id`) REFERENCES `asesorias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mensajes`
--
ALTER TABLE `mensajes`
  ADD CONSTRAINT `mensajes_ibfk_1` FOREIGN KEY (`remitente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mensajes_ibfk_2` FOREIGN KEY (`destinatario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mensajes_ibfk_3` FOREIGN KEY (`asesoria_id`) REFERENCES `asesorias` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `solicitudes`
--
ALTER TABLE `solicitudes`
  ADD CONSTRAINT `solicitudes_ibfk_1` FOREIGN KEY (`asesoria_id`) REFERENCES `asesorias` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `solicitudes_ibfk_2` FOREIGN KEY (`estudiante_solicitante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

-- Sesiones y códigos temporales para autenticación con verificación por correo.
CREATE TABLE IF NOT EXISTS `sesiones_usuario` (
  `token_hash` char(64) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `expira_en` datetime NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_hash`),
  KEY `idx_sesiones_usuario` (`usuario_id`),
  KEY `idx_sesiones_expiracion` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `codigos_login` (
  `challenge_id` char(36) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `codigo_hash` char(64) NOT NULL,
  `intentos` tinyint unsigned NOT NULL DEFAULT 0,
  `consumido` tinyint(1) NOT NULL DEFAULT 0,
  `expira_en` datetime NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`challenge_id`),
  KEY `idx_codigos_usuario_fecha` (`usuario_id`, `creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
