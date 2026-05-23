#!/bin/bash
# Ejecutar EN EL SERVIDOR (Ubuntu) después de clonar el repo
set -e

echo "==> Instalando Docker..."
apt-get update -qq
apt-get install -y docker.io docker-compose-plugin git ufw

systemctl enable docker
systemctl start docker

if [ ! -f .env ]; then
  echo "==> Creando .env desde ejemplo..."
  cp .env.example .env
  echo "IMPORTANTE: edita .env y cambia MONGO_ROOT_PASSWORD"
  echo "  nano .env"
fi

echo "==> Swap 1GB (recomendado para Droplet 512MB)..."
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 3000/tcp
ufw --force enable

echo "==> Construyendo y levantando contenedores..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "==> Esperando servicios..."
sleep 15
curl -sf http://localhost/api/health || curl -sf http://localhost:3000/api/health || true

echo ""
echo "Listo. Dashboard: http://$(curl -s ifconfig.me 2>/dev/null || echo TU_IP)/"
echo "API logs:      http://$(curl -s ifconfig.me 2>/dev/null || echo TU_IP):3000/api/logs"
