# odbc-as400-api

Read-only REST API that exposes IBM i (AS400) data over ODBC. Responses mirror the IBM i Integrated Web Services (IWS) shape so existing clients can switch over without changes.

- Express 4, CommonJS
- `odbc` npm package (native module)
- GET only, SELECT only. SQL lives in `src/endpoints/endpoints.json`; clients send parameter values only.

## Requirements

- Node.js 20, 22, or 24 (the `odbc` 2.6.0 native module supports only active LTS versions)
- IBM i Access ODBC Driver
- Windows: Visual Studio Build Tools is only needed if no prebuilt binary is available
- Linux: unixODBC, unixODBC development files, and a C++ toolchain

### Windows: IBM i Access ODBC Driver

1. Install IBM i Access Client Solutions (includes the ODBC driver).
2. Open **ODBC Data Source Administrator (64-bit)** and check the **Drivers** tab for `IBM i Access ODBC Driver`.
3. The name must match `DB_DRIVER` in `.env`. Use the 64-bit administrator, because Node.js is 64-bit.

### Linux: unixODBC and build tools

```bash
# Debian / Ubuntu
sudo apt install unixodbc unixodbc-dev build-essential python3

# RedHat / CentOS
sudo dnf install unixODBC unixODBC-devel gcc-c++ make python3
```

Install the IBM i Access ODBC driver for Linux from IBM, then register it in `odbcinst.ini` (usually `/etc/odbcinst.ini`). The library path depends on your install; check where the package placed `libcwbodbc.so`:

```ini
[IBM i Access ODBC Driver]
Driver = /opt/ibm/iaccess/lib64/libcwbodbc.so
```

Set `DB_DRIVER="IBM i Access ODBC Driver"` in `.env` to match the section name.

## Setup

```bash
npm install
npm approve-scripts odbc      # npm 12 does not run the odbc install script automatically
npm rebuild odbc
cp .env.example .env          # Windows: copy .env.example .env
```

Edit `.env` and fill in `DB_USER`, `DB_PASSWORD`, and `DB_LIBRARY`. Required variables are `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_LIBRARY`. The server exits at startup if any are missing.

## Run

```bash
npm start       # production-style
npm run dev     # nodemon, restarts on file change
npm test        # unit tests (no database needed)
```

On startup the server opens the ODBC pool and runs `SELECT 1 FROM SYSIBM.SYSDUMMY1` before listening on `PORT` (default 3099).

## Endpoints

| Method | Path | Parameters | Notes |
|--------|------|-----------|-------|
| GET | `/api/health` | none | 200 when the database answers, 503 otherwise |
| GET | `/api/web/services/MDVICE` | `cddevc` (required, max 10 chars) | Lookup by key |
| GET | `/api/web/services/WGPGBL` | none | All rows, capped by `ROW_LIMIT` |

Success response:

```json
{ "P_ISFOUND": "1", "rows": [ { "CDDEVC": "11251", "NMDEVC": "..." } ] }
```

Error response:

```json
{ "success": false, "error": "Missing required parameter: cddevc" }
```

Status codes: 400 bad input, 404 unknown route, 500 unexpected error (generic message in production), 503 database unavailable.

Full API reference: [docs/API.md](docs/API.md).

To add, edit, or remove an endpoint, use the endpoint manager (`npm run endpoints -- add --file <def.json>`, see [docs/ENDPOINT-MANAGER.md](docs/ENDPOINT-MANAGER.md)), or edit `src/endpoints/endpoints.json` directly. Each `:name` in `sqlTemplate` must be declared in `params`. The server validates the file at startup and refuses to start if the config is invalid.

## Manual checks (curl)

On Windows PowerShell use `curl.exe`, because `curl` is an alias for `Invoke-WebRequest`.

```bash
# 1. Health (expect 200 with status "ok", or 503 if the database is down)
curl -i http://localhost:3099/api/health

# 2. MDVICE without cddevc (expect 400)
curl -i "http://localhost:3099/api/web/services/MDVICE"

# 3. MDVICE with cddevc (expect 200, P_ISFOUND "1" or "0")
curl -i "http://localhost:3099/api/web/services/MDVICE?cddevc=11251"

# 4. Repeated parameter (expect 400)
curl -i "http://localhost:3099/api/web/services/MDVICE?cddevc=1&cddevc=2"

# 5. WGPGBL, all rows (expect 200, rows capped by ROW_LIMIT)
curl -i http://localhost:3099/api/web/services/WGPGBL

# 6. Unknown route (expect 404)
curl -i http://localhost:3099/api/unknown
```

The database connection is verified only when these calls return data from your IBM i system.

## Troubleshooting

**`npm install` fails with `self-signed certificate in certificate chain`**
A proxy or antivirus is intercepting HTTPS, so the odbc prebuilt binary cannot be downloaded. Get the root CA from IT and set it before installing:

```bat
set NODE_EXTRA_CA_CERTS=C:\path\to\corp-ca.pem
```

**`gyp ERR! find Python` or `Could not find any Python installation`**
Source build needs Python 3. Install Python 3.11 or newer and add it to PATH, or run `npm config set python "C:\Path\To\python.exe"`. Windows Store "python" aliases do not count.

**`EBUSY: resource busy or locked` when npm removes `node_modules`**
Close VS Code and any terminal opened in the project, then delete `node_modules` and run `npm install` again.

**`npm.ps1 cannot be loaded because running scripts is disabled`**
Run `npm.cmd` instead of `npm`, or allow local scripts for your user with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**`Module did not self-register` or `Cannot find module odbc.node`**
The native module was built for a different Node.js version. Run `npm rebuild odbc` under the same Node.js version that starts the server.

**`IM002 Data source name not found` or `Driver not found`**
`DB_DRIVER` does not match a driver registered in ODBC. On Windows, check the 64-bit administrator. On Linux, check `odbcinst.ini`.

**`Login failed` or `SQL0084`/authentication errors**
Check `DB_USER` and `DB_PASSWORD`. Passwords containing `}` are escaped automatically inside the connection string.

**Health returns 503**
Check the server console for `Health check failed`. Confirm `DB_HOST` is reachable from your machine and that no firewall blocks the IBM i database ports.

**`Missing value for parameter` or 500 from an endpoint**
The endpoint's `sqlTemplate` uses a `:name` that is not declared in `params` in `endpoints.json`. The server rejects this at startup, so restart after fixing the file.

**`.env.example` does not appear in git**
The `.gitignore` pattern `.env*` also matches `.env.example`. Use `.env` and `!.env.example` instead.

## Project layout

```
server.js                     entry point: pool init, probe, listen, graceful shutdown
src/app.js                    Express app and middleware
src/config/index.js           env loading and validation
src/db/pool.js                odbc pool lifecycle
src/db/query.js               the only place SQL is sent
src/db/sql.js                 pure helpers (named to positional, row cap, row normalization)
src/endpoints/endpoints.json  endpoint definitions
src/endpoints/registry.js     startup validation of endpoint config
src/services/endpointService.js  request parameter validation
src/controllers/endpointController.js  handler factory
src/routes/index.js           route registration and health check
src/middleware/errorHandler.js notFound and error handler
src/utils/AppError.js         operational error class
scripts/endpoint-manager.js   CLI to list, add, update, remove endpoints
docs/API.md                   API reference
docs/ENDPOINT-MANAGER.md      endpoint manager guide
test/logic.test.js            node:test unit tests
test/endpoint-manager.test.js endpoint manager tests
```
