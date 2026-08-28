# TradeOS-gemini
# Local Auth0 Dev (hosts + TLS)

This README explains how to run the local Auth0 Flask backend so OAuth redirects use `http://localhost:3000/` while running the server on your machine.

WARNING: These steps modify your system `hosts` file and require admin privileges to bind port 3000. Follow them only on a development machine.

## Quick summary

- Map `localhost` to `127.0.0.1` in your hosts file.
- Use `mkcert` to create a locally-trusted TLS cert for `localhost`.
- Configure `.env` to point to the generated cert/key and set `APP_BASE_URL=http://localhost:3000/`.
- Run the Flask app as Administrator so it can bind port 3000.

## 1) Add hosts entry

Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator and add:

```
127.0.0.1 localhost
```

Save the file.

## 2) Install and trust `mkcert`

- With Chocolatey (recommended):

```powershell
choco install mkcert
mkcert -install
```

- Or follow instructions on https://mkcert.dev for alternate install methods.

## 3) Generate a certificate for `localhost`

Run from the project directory (where you want the cert files):

```bash
mkcert localhost
```

This will produce two files like `localhost.pem` and `localhost-key.pem`.

## 4) Update `.env`

Add or update these variables in `.env` (paths may be relative to the repo root):

```
APP_BASE_URL=http://localhost:3000/
AUTH0_SSL_CERT=./localhost.pem
AUTH0_SSL_KEY=./localhost-key.pem
AUTH0_BIND_HOST=localhost
AUTH0_BIND_PORT=3000
```

Keep your existing Auth0 variables (domain, client id/secret, `AUTH0_SECRET`) as-is.

## 5) Run the Flask app (Administrator required to bind port 3000)

Open PowerShell as Administrator and run:

```powershell
$env:AUTH0_SSL_CERT="./localhost.pem"
$env:AUTH0_SSL_KEY="./localhost-key.pem"
$env:AUTH0_BIND_HOST="localhost"
$env:AUTH0_BIND_PORT="3000"
python auth0_flask_app.py
```

Or set the same variables in `.env` and run `python auth0_flask_app.py` from an elevated shell.

## 6) Browser

Open `https://localhost` in your browser. Since `mkcert` trusted the CA, the browser should accept the certificate.

## Alternatives and notes

- If you cannot edit the hosts file or bind to 3000, consider using a tunneling service (ngrok) and register the tunnel URL in Auth0 as the callback/allowed origin.
- For fast dev testing without TLS, you can run the server on `127.0.0.1:5000` and set `APP_BASE_URL` accordingly; however, OAuth redirect URIs must match what is registered in Auth0.
- The Flask app supports `AUTH0_SSL_CERT` and `AUTH0_SSL_KEY` env vars to enable TLS when starting locally.

If you want, I can add a small PowerShell script `scripts/run-dev.ps1` to automate the mkcert invocation and run command.
