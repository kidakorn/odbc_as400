# IWS Clone — API Documentation & Integration Guide

## Overview

**IWS Clone** is a local middleware designed to simulate the IBM i Integrated Web Services (IWS) environment. 
It operates as an **Express HTTP Server on `http://localhost:3099`** locally, allowing other projects 
(Next.js, React, Vue, Python, etc.) to fetch data from IBM i (AS400/pub400) or a local SQLite database 
via REST API without needing to manage ODBC or SSH connections independently.

```
┌──────────────────────┐       HTTP REST      ┌─────────────────────┐
│    Your Project      │ ─────────────────► │   IWS Clone         │
│  (Next.js / Python)  │   localhost:3099     │   Express :3099     │
└──────────────────────┘                      └────────┬────────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          │                         │
                                    ┌─────▼─────┐           ┌──────▼──────┐
                                    │  AS400/   │           │   SQLite    │
                                    │ pub400.com│           │  local.db   │
                                    └───────────┘           └─────────────┘
```

> **Note:** IWS Clone must be running (Electron app must be open) before other projects can call its APIs.

---

## Base URL

```
http://localhost:3099
```

---

## Core API Endpoints

### 1. Health Check

Check if the IWS Clone server is running.

```http
GET /api/health
```

**Example Response:**
```json
{
  "status": "ok",
  "datasource": "sqlite",
  "timestamp": "2026-10-05T14:00:00.000Z"
}
```

---

### 2. SQL Query (READ ONLY)

Execute direct SQL SELECT statements against the selected datasource.

```http
POST /api/query
Content-Type: application/json
```

**Body:**
```json
{
  "sql": "SELECT * FROM WGPGBL WHERE CDBRNC = :branch",
  "params": { "branch": "TH" },
  "datasource": "sqlite"
}
```

| Field | Value | Description |
|-------|-----|---------|
| `sql` | string | SQL command (SELECT only) |
| `params` | object | Named parameters (:key) |
| `datasource` | `"sqlite"` or `"odbc"` | Target datasource |

**Example Response:**
```json
{
  "success": true,
  "rows": [
    { "CDBRNC": "TH", "NMBRNC": "Thailand" }
  ],
  "rowCount": 5
}
```

---

### 3. Dynamic Endpoints (Web Services)

Endpoints configured in `endpoints.json`.
Functions like standard REST APIs; no SQL knowledge required.

**URL Format:**
```
GET /api/web/services/{TABLE_NAME}?{param}={value}
```

**Existing Endpoints Examples:**

```http
GET /api/web/services/ACUSER?username=KIDAKORN
GET /api/web/services/ACNOTI?user=KIDAKORN
GET /api/web/services/ACAPPR?type=PO&reqno=1001
GET /api/web/services/TMTRCL?cnlotn=LOT001
GET /api/talinf?lotno=2024001
GET /api/employee?empid=E001
GET /api/web/services/MDVICE?cddevc=11251
```

**Example Response:**
```json
{
  "P_ISFOUND": "1",
  "rows": [
    { "CDDEVC": "11251", "NMDEVC": "Device Name" }
  ]
}
```

---

### 4. Schema Browser

Retrieve the list of tables and columns from the datasource.

```http
GET /api/schema/tables?datasource=sqlite
GET /api/schema/tables?library=X0250661
GET /api/schema/columns?datasource=sqlite&table=WGPGBL
GET /api/schema/columns?library=X0250661&table=MDVICE
```

---

## Integration Examples

### Next.js / React (fetch)

```typescript
// lib/iws.ts
const IWS_BASE = 'http://localhost:3099';

export async function getDevice(cddevc: string) {
  const res = await fetch(`${IWS_BASE}/api/web/services/MDVICE?cddevc=${cddevc}`);
  if (!res.ok) throw new Error('IWS Error');
  return res.json();
}

export async function querySQL(sql: string, params: Record<string, string>) {
  const res = await fetch(`${IWS_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params, datasource: 'sqlite' })
  });
  return res.json();
}
```

### Next.js App Router (Server Component)

```typescript
// app/api/device/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cddevc = req.nextUrl.searchParams.get('cddevc');
  const res = await fetch(
    `http://localhost:3099/api/web/services/MDVICE?cddevc=${cddevc}`,
    { cache: 'no-store' }
  );
  return NextResponse.json(await res.json());
}
```

### Python (requests)

```python
import requests

IWS_BASE = "http://localhost:3099"

def get_device(cddevc: str):
    r = requests.get(f"{IWS_BASE}/api/web/services/MDVICE", params={"cddevc": cddevc})
    r.raise_for_status()
    return r.json()

def query_sql(sql: str, params: dict, datasource="sqlite"):
    r = requests.post(f"{IWS_BASE}/api/query", json={
        "sql": sql, "params": params, "datasource": datasource
    })
    return r.json()
```

### Axios (JavaScript/Node.js)

```javascript
const axios = require('axios');
const iws = axios.create({ baseURL: 'http://localhost:3099' });

const { data } = await iws.get('/api/web/services/ACUSER', { params: { username: 'KIDAKORN' } });

const { data: result } = await iws.post('/api/query', {
  sql: 'SELECT * FROM WGPGBL LIMIT 10',
  params: {},
  datasource: 'sqlite'
});
```

---

## Available SQLite Tables

| Table | Source | Data Description |
|-------|-------------|--------|
| `MDVPFL` | logic.xlsx | Device Profile |
| `MDVSHP` | logic.xlsx | Device Shape |
| `MSHPTO` | logic.xlsx | Ship To |
| `NRPLWY` | logic.xlsx | Plating/Way |
| `TCNTRL` | logic.xlsx | Control |
| `MPRCES` | logic.xlsx | Process |
| `TALINF05` | logic.xlsx | Assembly Info |
| `MDVICE` | logic.xlsx | Device Master |
| `CDDGRP` | logic.xlsx | Device Group Code |
| `MGPGST` | MGPGST.xlsx | MGPGST |
| `MSBPRC` | logic.xlsx | Sub Process |
| `WGPGBL` | WGPGBL.xlsx | Global Setting/Branch |

---

## Creating New Endpoints

### Method 1: Using the GUI (Recommended)
1. Open IWS Clone → **Config (IWS Studio)** tab.
2. Fill in the Path, SQL, and Parameters.
3. Click **Save & Deploy** → The endpoint is instantly available (no restart required).

### Method 2: Editing `endpoints.json` directly

```json
{
  "id": "wgpgbl-by-branch",
  "path": "/api/web/services/WGPGBL",
  "method": "GET",
  "description": "Get WGPGBL by branch code",
  "sqlTemplate": "SELECT * FROM WGPGBL WHERE CDBRNC = :branch",
  "paramMapping": { "branch": "branch" },
  "fieldMapping": {}
}
```

---

## Prompt for AI Agents / External Projects

Copy this prompt into the `AGENTS.md` or system prompt of your other projects to give AI agents context:

```
## IWS Clone Integration

This project connects to IWS Clone (IBM i Middleware) running locally.
Base URL: http://localhost:3099

Core Endpoints:
- GET  /api/health                          → Health check
- POST /api/query                           → Execute SQL SELECT
- GET  /api/schema/tables?datasource=sqlite → List all tables
- GET  /api/web/services/{TABLE}?{p}={v}   → Dynamic endpoints

Datasource options: "sqlite" (local) or "odbc" (AS400/pub400.com)

Available SQLite tables:
MDVICE, MDVPFL, MDVSHP, MSHPTO, NRPLWY, TCNTRL,
MPRCES, TALINF05, CDDGRP, MGPGST, MSBPRC, WGPGBL

Data Fetching Example:
  fetch('http://localhost:3099/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: 'SELECT * FROM WGPGBL WHERE CDBRNC = :b',
      params: { b: 'TH' },
      datasource: 'sqlite'
    })
  })
```

---

## Field Naming Convention

| Prefix | Category | Example |
|--------|---------|---------|
| `CD` | Code | `CDDEVC`, `CDBRNC` |
| `NM` | Name | `NMDEVC`, `NMBRNC` |
| `CN` | Control Number | `CNLOTN`, `CNASSY` |
| `QT` | Quantity | `QTSTKP`, `QTSTKS` |
| `AM` | Amount | `AMTOT` |
| `D8` | Date YYYYMMDD | `D8SHIP` |
| `FG` | Flag (Status) | `FGACTV` |
| `TX` | Text/Description | `TXRMRK` |
| `PR` | Price | `PRUNIT` |
| `RT` | Rate | `RTCONV` |

---

*Check the `endpoints.json` file for a complete list of deployed endpoints.*
