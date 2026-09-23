# VPS Deployment & Operations Guide

**Target OS:** Ubuntu 24.04 / 22.04 LTS  
**Deployment Tool:** Docker Compose & Nginx  
**Topology:** Single VPS Host with Independent Service Isolation

---

## 1. Initial VPS Provisioning

### A. System Update & Package Installation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw curl git htop gzip fail2ban certbot python3-certbot-nginx
```

### B. Docker Engine Installation
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### C. Firewall Configuration (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. Deployment Procedure

### A. Clone Repository & Setup Secrets
```bash
git clone https://github.com/your-org/school-management-system.git /opt/school-system
cd /opt/school-system
cp .env.example .env
# Edit .env and enter cryptographically secure passwords and secrets
nano .env
```

### B. Launch Production Docker Compose Stack
```bash
cd infrastructure/docker
docker compose -f docker-compose.prod.yml up -d --build
```

### C. Run Database Migrations
```bash
docker exec -it school_prod_api pnpm prisma:deploy
```

### D. Automated Nightly Backups
Add to root crontab (`sudo crontab -e`):
```cron
0 2 * * * /opt/school-system/infrastructure/scripts/backup-db.sh >> /var/log/school_backup.log 2>&1
```

---

## 3. Independent Service Lifecycle Management

Each component can be scaled, restarted, or updated without taking down the rest of the ecosystem:
```bash
# Restart API backend only
docker compose -f docker-compose.prod.yml restart api

# View real-time database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# Inspect Redis queue memory consumption
docker exec -it school_prod_redis redis-cli info memory
```
