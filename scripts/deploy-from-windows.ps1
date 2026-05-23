# Ejecutar en PowerShell desde tu PC (requiere SSH al Droplet)
# Uso: .\scripts\deploy-from-windows.ps1

$SERVER = "157.230.187.111"
$REPO = "https://github.com/abnersac/prosistemas.git"

Write-Host "Desplegando en $SERVER ..." -ForegroundColor Cyan

$remoteScript = @"
set -e
apt-get update -qq
apt-get install -y docker.io docker-compose-plugin git ufw
systemctl enable docker --now
cd /root
if [ ! -d prosistemas ]; then git clone $REPO prosistemas; fi
cd prosistemas
git pull origin main || true
if [ ! -f .env ]; then cp .env.example .env; fi
if ! grep -q 'MONGO_ROOT_PASSWORD=.' .env || grep -q 'cambiar_password' .env; then
  echo 'Edita /root/prosistemas/.env con una contraseña segura antes de continuar.'
  exit 1
fi
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 3000/tcp
ufw --force enable
docker compose down 2>/dev/null || true
docker compose up -d --build
sleep 12
curl -s http://localhost:3000/api/health || true
echo DONE
"@

ssh root@$SERVER $remoteScript

Write-Host ""
Write-Host "Dashboard: http://$SERVER/" -ForegroundColor Green
Write-Host "API:       http://${SERVER}:3000/api/logs" -ForegroundColor Green
