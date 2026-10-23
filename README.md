# SupportHub · Frontend

Aplicación web de la mesa de ayuda: tickets, equipos, usuarios, auditoría y notificaciones.
Angular 22 (sin Zone.js, con `OnPush` y signals), Signal Forms, Angular CDK, SCSS y variables CSS.
Funciona con el backend de SupportHub (Spring Boot).

## Requisitos
- Node.js 22 y npm
- El backend en marcha (ver su README). Para desarrollar, el perfil `local` crea cuentas de demostración.

## Desarrollo
```bash
npm ci
npm start            # http://localhost:4200
```
`proxy.conf.json` reenvía `/api` a `http://localhost:8080`, así el navegador ve un solo origen (como en producción).

Cuentas de demostración (perfil `local`, contraseña `Demo1234!`): `admin@`, `agent@`, `agent2@`, `assets@` y `user@supporthub.local`.

## Scripts
| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con proxy a la API |
| `npm run build` | Compilación de producción, con presupuestos de tamaño |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:coverage` | Con cobertura; los umbrales están en `angular.json` |
| `npm run e2e` | Pruebas de extremo a extremo y de accesibilidad (Playwright + axe) |
| `npm run unused` | Código y dependencias sin usar (knip) |
| `npm run analyze` | Genera `stats.json` para ver el contenido de los paquetes |
| `ng lint` | ESLint, con reglas de accesibilidad en las plantillas |

## Pruebas de extremo a extremo
Necesitan el backend con perfil `local` y el frontend en marcha.
```bash
npm start            # en una terminal
npm run e2e          # en otra
npm run e2e:report   # informe con capturas y trazas
```
Crean datos (tickets, equipos): **nunca** las apuntes a un entorno real. Para otro servidor: `E2E_BASE_URL`, `E2E_PASSWORD`.

## Despliegue con Docker
Un solo origen: nginx sirve la aplicación y reenvía `/api/` al backend. Solo nginx publica un puerto.
```bash
cp .env.example .env            # completa los valores (BACKEND_DIR, POSTGRES_PASSWORD, JWT_SECRET…)
docker compose up -d --build
```
La aplicación queda en `http://localhost:8081`. El primer administrador es el de `BOOTSTRAP_ADMIN_*`.
No hay cuentas de demostración en este modo.

Para ejecutar las pruebas de extremo a extremo contra el contenedor (con cuentas de demostración):
```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
```
```powershell
# PowerShell
$env:E2E_BASE_URL = "http://localhost:8081"; $env:E2E_DEPLOYED = "1"; npm run e2e
```
```bash
# bash
E2E_BASE_URL=http://localhost:8081 E2E_DEPLOYED=1 npm run e2e
```

### Variables
| Variable | Descripción |
|---|---|
| `BACKEND_DIR` | Carpeta del backend (para construir su imagen) |
| `POSTGRES_PASSWORD`, `JWT_SECRET` | Obligatorias. `JWT_SECRET`: mínimo 32 caracteres |
| `BOOTSTRAP_ADMIN_*` | Primer administrador |
| `PUBLIC_ORIGIN`, `HTTP_PORT` | Dirección pública y puerto de publicación |
| `COOKIE_SECURE` | `true` (HTTPS). `false` solo para probar sin HTTPS |
| `BACKEND_URL`, `DNS_RESOLVER` | De la imagen del frontend: destino de `/api/` (sin ruta) y servidor DNS |

## Arquitectura
- `core/`: API, sesión (cookies HttpOnly + CSRF, sin tokens en el navegador), guards y utilidades.
- `shared/ui`: el kit de componentes. `shared/domain`: etiquetas y chips del dominio.
- `features/`: una carpeta por módulo (`tickets`, `assets`, `users`, `audit`, `dashboard`, `notifications`…).
- **Qué se puede hacer lo decide el servidor** (`actions` en tickets y equipos): el cliente no copia reglas de negocio.
- El estado de las listas vive en la URL: se comparte, funciona con "atrás" y sobrevive a recargar.
- Dentro de `shared/ui` y `shared/domain`, los componentes se importan por su ruta, nunca por el barril (crea ciclos).

## Seguridad
- Cookies `HttpOnly` y `SameSite=Strict`; CSRF con cabecera; sesión renovada de forma transparente.
- Política de contenido estricta (sin código en línea) y cabeceras de seguridad en nginx.
- Todo texto de personas se muestra como texto, nunca como HTML.
- `returnUrl` solo acepta rutas internas.

## Puesta en producción
- [ ] **HTTPS** delante de nginx (balanceador o proxy inverso) y `COOKIE_SECURE=true`. Añade HSTS ahí.
- [ ] Secretos solo en variables de entorno o un gestor de secretos; nunca en el repositorio.
- [ ] Si hay un proxy delante de nginx, configura `set_real_ip_from` y `real_ip_header` para que el backend vea la IP real.
- [ ] Copias de seguridad de los volúmenes `pgdata` y `files`.
- [ ] Fija la versión de la imagen de nginx (mejor, su resumen sha256).
- [ ] `docker compose down` conserva los datos; `down -v` **los borra**.

## Limitaciones
- Sin tiempo real: la campana consulta cada minuto; las pantallas se actualizan al recargar o con "Actualizar".
- Los días del gráfico del resumen se cuentan en UTC.
- Sin recuperación de contraseña por correo: un administrador la restablece.
