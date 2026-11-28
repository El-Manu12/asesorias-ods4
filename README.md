# AulaConnect

## Estructura

- `frontend/`: páginas, estilos e imágenes públicas.
- `frontend/css/`: hoja de estilos compartida y tema visual.
- `frontend/js/`: módulos compartidos del calendario y las notificaciones.
- `backend/server.js`: API y servidor Express activos.
- `backend/legacy/php/`: API PHP anterior, conservada como referencia y fuera del flujo actual.
- `database/schema.sql`: esquema y datos iniciales de MySQL.

## Iniciar el sistema

1. Inicia MySQL y asegúrate de tener creada/restaurada la base `db_asesorias_sistema`.
2. Desde la carpeta raíz ejecuta `npm start`.
3. Abre `http://localhost:3000`.

También se conserva `node server.js` como forma compatible de iniciar el backend.

## Correo de verificación

El inicio de sesión usa un código de seis dígitos enviado por la API transaccional de Brevo. Copia `.env.example` a `.env`, configura `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` y, opcionalmente, `BREVO_SENDER_NAME`, y reinicia el backend. Genera una clave API REST (empieza con `xkeysib-`) desde **Settings → SMTP & API → API Keys & MCP**. Registra y verifica la dirección remitente en **Settings → Senders, Domains, IPs → Senders**. La clave se mantiene únicamente en `.env`, que está excluido de Git.

Si la base no tiene ningún usuario con rol `admin`, abre `configurar-admin.html` para crear el primer administrador. Después de crearlo, ese formulario queda bloqueado; los administradores pueden asignar ese rol desde `admin.html`.
