# Deployment Guide — VPS (DigitalOcean / Linode)

## 1. Create your VPS

On DigitalOcean or Linode, create a droplet/instance:
- **OS:** Ubuntu 22.04 LTS
- **Size:** $6/mo (1 GB RAM) is plenty
- Add your SSH key during setup

---

## 2. SSH in and set up the server

```sh
ssh root@YOUR_SERVER_IP
```

**Install Node via nvm:**
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
node -v  # should print v24.x
```

**Install PM2** (keeps the app alive after you disconnect):
```sh
npm install -g pm2
```

**Install nginx:**
```sh
apt update && apt install -y nginx
```

---

## 3. Deploy the app

```sh
git clone https://github.com/kulicka/drawable-trouble.git
cd drawable-trouble
npm install
pm2 start server.js --name drawable-trouble
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

The app is now running on port 3000 internally.

---

## 4. Configure nginx

```sh
nano /etc/nginx/sites-available/drawable-trouble
```

Paste this — replace `YOUR_DOMAIN_OR_IP` with your server's IP or domain name:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload nginx:

```sh
ln -s /etc/nginx/sites-available/drawable-trouble /etc/nginx/sites-enabled/
nginx -t                  # confirm config is valid
systemctl reload nginx
```

The game is now live at `http://YOUR_SERVER_IP`.

---

## 5. Add HTTPS (optional but recommended)

If you have a domain name pointed at your server's IP:

```sh
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Certbot updates the nginx config automatically and sets up auto-renewal.
After this, players connect over `https://yourdomain.com`.

---

## Updating the game

When you push new code to GitHub, on the server run:

```sh
cd ~/drawable-trouble
git pull
npm install        # only needed if package.json changed
pm2 restart drawable-trouble
```
