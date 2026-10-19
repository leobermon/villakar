# Subir VillaKar a producción (VPS con Docker)

Resultado final:

| Qué | Dirección |
|---|---|
| Sitio de reservas | https://villakartransfers.com (www redirige aquí) |
| Panel de administración | https://admin.villakartransfers.com |

Todo corre en Docker dentro del VPS: MySQL 8, el backend, el sitio + panel (Caddy, con HTTPS
automático) y un respaldo diario de la base. Se configura con un solo archivo `.env`.

> Los comandos marcados **VPS** se escriben en la consola del servidor (por SSH).
> Los marcados **PC** se escriben en PowerShell en tu computadora, dentro de la carpeta del proyecto.

---

## 1. DNS del dominio (hPanel de Hostinger)

En **hPanel → Dominios → villakartransfers.com → DNS / Nameservers**, crea o edita estos registros
tipo **A** con la IP de tu VPS:

| Tipo | Nombre | Apunta a |
|---|---|---|
| A | `@` | IP del VPS |
| A | `www` | IP del VPS |
| A | `admin` | IP del VPS |

- Si ya existe un registro `A` para `@` o `www` (del hosting compartido), **edítalo**: solo debe
  haber uno por nombre.
- **No toques** los registros `MX`, `TXT` (SPF/DKIM) ni los de correo: el correo
  `reservations@villakartransfers.com` sigue en Hostinger.
- Los cambios tardan de minutos a unas horas. Para comprobar (PC): `nslookup admin.villakartransfers.com`
  debe responder con la IP del VPS.

**Haz el paso 5 solo cuando los tres nombres ya apunten al VPS**: Caddy pide los certificados
HTTPS al arrancar y Let's Encrypt los rechaza si el dominio aún no apunta al servidor.

## 2. Preparar el VPS

**VPS** — comprueba que tienes Docker Compose v2 y git:

```bash
docker compose version
git --version
```

Si falta git: `sudo apt update && sudo apt install -y git`.

Abre solo los puertos necesarios (si usas `ufw`):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

> Si el VPS tiene también un firewall en el panel de Hostinger, abre ahí los puertos 80 y 443.

## 3. Descargar el proyecto (repositorio privado)

El repositorio es privado, así que el VPS necesita una **llave de solo lectura** (deploy key).

**VPS** — crea la llave y muestra la parte pública:

```bash
ssh-keygen -t ed25519 -C "vps-villakar" -f ~/.ssh/villakar_deploy -N ""
cat ~/.ssh/villakar_deploy.pub
```

En GitHub: **repositorio villakar → Settings → Deploy keys → Add deploy key**. Pega lo que
mostró `cat` (empieza con `ssh-ed25519`), ponle de título "VPS" y **deja sin marcar**
"Allow write access".

**VPS** — clona el proyecto:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-villakar
  HostName github.com
  User git
  IdentityFile ~/.ssh/villakar_deploy
EOF
git clone github-villakar:leobermon/villakar.git ~/villakar
cd ~/villakar
```

## 4. Configurar las variables (`.env`)

**VPS**:

```bash
cp .env.production.example .env
nano .env
```

Llena los valores vacíos. Para contraseñas y secretos genera valores aleatorios con:

```bash
openssl rand -hex 24   # MYSQL_PASSWORD y MYSQL_ROOT_PASSWORD (uno distinto para cada una)
openssl rand -hex 48   # ADMIN_JWT_SECRET
```

| Variable | Qué poner |
|---|---|
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Generadas con `openssl rand -hex 24` |
| `GOOGLE_MAPS_SERVER_KEY` | La misma clave de Google que usas en `backend/.env` de tu PC |
| `SMTP_PASS` | La contraseña del buzón `reservations@villakartransfers.com` |
| `ADMIN_JWT_SECRET` | Generado con `openssl rand -hex 48` |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | Tu correo y contraseña para entrar al panel (mínimo 12 caracteres) |

En `nano`: guarda con **Ctrl+O** y Enter, sal con **Ctrl+X**.

Protege el archivo para que solo tu usuario lo lea:

```bash
chmod 600 .env
```

## 5. Arrancar

**VPS**:

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos (descarga y construye todo). Revisa que esté arriba:

```bash
docker compose ps
docker compose logs backend --tail 30
docker compose logs web --tail 30
```

- En `backend` debe aparecer `All migrations have been successfully applied` y
  `Nest application successfully started`.
- En `web` debe aparecer `certificate obtained successfully` para los tres nombres.

## 6. Crear tu usuario del panel

**VPS** (una sola vez):

```bash
docker compose exec -e SEED_ADMIN_ONLY=true backend npx prisma db seed
```

Debe decir `Usuario del panel creado`. Después **borra la contraseña del `.env`** (deja
`ADMIN_SEED_PASSWORD=` vacío) para que no quede guardada en el servidor:

```bash
nano .env
docker compose up -d
```

## 7. Pasar tus tarifas, zonas y vehículos desde tu PC

La base del VPS empieza vacía. Lleva el catálogo que configuraste en tu computadora (tipos de
vehículo, zonas, tarifas y hoteles ya buscados). **No** se copian las reservas de prueba.

**PC** (Docker Desktop encendido, dentro de la carpeta del proyecto):

```powershell
docker exec cancun-transfers-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --no-create-info --complete-insert --hex-blob --skip-triggers --no-tablespaces "$MYSQL_DATABASE" vehicle_types zones zone_rates places > /tmp/catalogo.sql'
docker cp cancun-transfers-mysql:/tmp/catalogo.sql .\catalogo.sql
scp .\catalogo.sql TU_USUARIO@IP_DEL_VPS:~/villakar/
```

**VPS**:

```bash
cd ~/villakar
docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < catalogo.sql
rm catalogo.sql
```

> Hazlo una sola vez y con la base recién creada: si lo repites, MySQL rechazará los
> registros duplicados. Las unidades de la flota (placas) se capturan directamente en el panel.

## 8. Probar

1. Abre https://villakartransfers.com, busca un hotel y haz una reserva de prueba con pago en efectivo.
2. Revisa que llegue el correo de confirmación (desde `reservations@villakartransfers.com`).
3. Entra a https://admin.villakartransfers.com con tu usuario: la reserva debe aparecer en Órdenes.
4. Cancela o borra esa reserva de prueba desde el panel.

**Google Maps:** en Google Cloud → Credenciales, restringe la clave de servidor a la IP del VPS
(Restricciones de aplicación → Direcciones IP).

---

## Uso diario

| Para… | Comando (VPS, en `~/villakar`) |
|---|---|
| Publicar una versión nueva (después de subirla a GitHub) | `git pull && docker compose up -d --build` |
| Ver si todo está corriendo | `docker compose ps` |
| Ver errores del backend | `docker compose logs backend --tail 100` |
| Reiniciar todo | `docker compose restart` |
| Apagar todo (sin borrar datos) | `docker compose down` |

Las migraciones de la base se aplican solas cada vez que arranca el backend.

> **Nunca** uses `docker compose down -v`: la `-v` borra la base de datos y los certificados.

## Respaldos

El servicio `backup` guarda un respaldo de la base cada 24 horas en `~/villakar/backups/`
(últimos 14 días). Ver los respaldos:

```bash
ls -lh ~/villakar/backups
```

Guarda copias fuera del VPS de vez en cuando (si el servidor se pierde, se pierden también).
Desde tu **PC**:

```powershell
scp "TU_USUARIO@IP_DEL_VPS:~/villakar/backups/*.sql.gz" .\respaldos\
```

Restaurar un respaldo (**VPS**; reemplaza el contenido actual de la base):

```bash
gunzip -c backups/ARCHIVO.sql.gz | docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

## Más adelante: pagos en línea

Cuando tengas las claves reales de Stripe y PayPal, ponlas en el `.env` del VPS y corre
`docker compose up -d`. En Stripe, el webhook va a:
`https://villakartransfers.com/api/payments/stripe/webhook`
