#!/bin/sh
# Respaldo diario de MySQL: un archivo .sql.gz por día en /backups (carpeta ./backups del servidor).
# Borra los respaldos con más de KEEP_DAYS días. Lo corre el servicio "backup" de docker-compose.prod.yml.
set -eu

while true; do
  file="/backups/${MYSQL_DATABASE}-$(date -u +%Y-%m-%d_%H%M).sql.gz"
  if mysqldump -h mysql -u "$MYSQL_USER" --single-transaction --no-tablespaces --routines --hex-blob \
      "$MYSQL_DATABASE" | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "Respaldo creado: $file"
  else
    rm -f "$file.tmp"
    echo "ERROR: no se pudo crear el respaldo" >&2
  fi
  find /backups -name '*.sql.gz' -mtime "+${KEEP_DAYS}" -delete
  sleep 86400
done
