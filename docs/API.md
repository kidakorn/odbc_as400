# API Reference

เอกสารนี้อธิบาย REST API ของ `odbc-as400-api` ที่ให้บริการข้อมูลจาก IBM i (AS400) ผ่าน ODBC
ข้อมูลทั้งหมดเป็น **read-only** (GET + SELECT เท่านั้น)

- Base URL: `http://localhost:3099` (ค่า `PORT` ใน `.env`, default `3099`)
- Authentication: ไม่มี (ควรเปิดใช้งานเฉพาะใน network ภายใน)
- Content-Type ของ response: `application/json`
- CORS: อนุญาตเฉพาะ origin ที่ตั้งใน `CORS_ORIGIN` และอนุญาตเฉพาะ method `GET`

ถ้าต้องการเพิ่ม แก้ไข หรือลบ endpoint ดูที่ [ENDPOINT-MANAGER.md](./ENDPOINT-MANAGER.md)

---

## สารบัญ

- [Health check](#get-apihealth)
- [MDVICE: ค้นหาข้อมูล device ตามรหัส](#get-apiwebservicesmdvice)
- [WGPGBL: ดึงข้อมูล global setting/branch ทั้งหมด](#get-apiwebservicesWGPGBL)
- [MGPGST: ดึงข้อมูล group package stock แบบแบ่งหน้า](#get-apiwebservicesmgpgst)
- [รูปแบบ response](#รูปแบบ-response)
- [Error responses](#error-responses)
- [ตัวอย่างการเรียกใช้งาน](#ตัวอย่างการเรียกใช้งาน)

---

## GET /api/health

ตรวจสอบว่า server ทำงานอยู่ และ database ตอบสนองหรือไม่ (รัน `SELECT 1 FROM SYSIBM.SYSDUMMY1`)

**Parameters:** ไม่มี

**Response 200** (database ตอบสนอง)

```json
{
  "status": "ok",
  "datasource": "odbc",
  "timestamp": "2026-10-08T04:38:12.662Z"
}
```

**Response 503** (database ใช้งานไม่ได้)

```json
{ "success": false, "error": "Database unavailable" }
```

---

## GET /api/web/services/MDVICE

ค้นหา master record ของ device จากรหัส device

```
SELECT * FROM MDVICE WHERE CDDEVC = :cddevc
```

| Parameter | ตำแหน่ง | Required | ความยาวสูงสุด | คำอธิบาย |
|-----------|---------|----------|---------------|----------|
| `cddevc`  | query   | ใช่      | 10 ตัวอักษร   | รหัส device (`CDDEVC`) |

**Request**

```
GET /api/web/services/MDVICE?cddevc=11251
```

**Response 200** (พบข้อมูล)

```json
{
  "P_ISFOUND": "1",
  "rows": [
    { "CDDEVC": "11251", "...": "..." }
  ]
}
```

**Response 200** (ไม่พบข้อมูล)

```json
{ "P_ISFOUND": "0", "rows": [] }
```

ไม่พบข้อมูลถือเป็น 200 ไม่ใช่ 404 ให้ตรวจค่า `P_ISFOUND` เพื่อแยกว่าพบหรือไม่

---

## GET /api/web/services/WGPGBL

ดึง global setting/branch rows ทั้งหมดจากตาราง `WGPGBL`

```
SELECT * FROM WGPGBL
```

**Parameters:** ไม่มี

**Request**

```
GET /api/web/services/WGPGBL
```

**Response 200**

```json
{
  "P_ISFOUND": "1",
  "rows": [
    { "...": "..." }
  ]
}
```

- ไม่จำกัดจำนวน row (endpoint นี้ตั้งค่า `fetchAll`) ตารางใหญ่จะใช้หน่วยความจำและเวลามาก
- ถ้าตารางว่าง จะได้ `"P_ISFOUND": "0"` และ `"rows": []`

---

## GET /api/web/services/MGPGST

ดึง group package stock master แบบแบ่งหน้า

```
SELECT * FROM MGPGST ORDER BY CDPAKG OFFSET {offset} ROWS FETCH FIRST {limit} ROWS ONLY
```

| Parameter | ตำแหน่ง | Required | ค่า default | คำอธิบาย |
|-----------|---------|----------|-------------|----------|
| `limit`   | query   | ไม่      | `PAGE_SIZE` (100) | จำนวน row ต่อหน้า 1 ถึง `ROW_LIMIT` (500) |
| `offset`  | query   | ไม่      | `0`         | จำนวน row ที่ข้าม ต้องเป็นจำนวนเต็มไม่ติดลบ |

**Request**

```
GET /api/web/services/MGPGST?limit=100&offset=0
```

**Response 200**

```json
{
  "P_ISFOUND": "1",
  "rows": [ { "...": "..." } ],
  "limit": 100,
  "offset": 0
}
```

วนดึงทุกหน้าโดยเพิ่ม `offset` ทีละ `limit` จนได้ `rows` น้อยกว่า `limit` หรือใช้สคริปต์ `node scripts/fetch-all.js /api/web/services/MGPGST --out mgpgst.json`

---

## รูปแบบ response

### Success

| Field | Type | คำอธิบาย |
|-------|------|----------|
| `P_ISFOUND` | string | `"1"` ถ้ามีอย่างน้อย 1 row, `"0"` ถ้าไม่มี |
| `rows` | array | รายการ row โดยแต่ละ row เป็น object ที่ key คือชื่อคอลัมน์ |
| `limit` | number | มีเฉพาะ endpoint ที่แบ่งหน้า: จำนวน row ต่อหน้าที่ใช้ |
| `offset` | number | มีเฉพาะ endpoint ที่แบ่งหน้า: จำนวน row ที่ข้ามไป |

การแปลงค่าใน `rows`:

- ค่า CHAR ที่ถูก pad ด้วย space จะถูกตัด space ท้ายออก (`trimEnd`)
- ค่า BIGINT จะถูกส่งเป็น string เพื่อไม่ให้ JSON serialize ไม่ได้
- ค่า NULL ส่งเป็น `null`

### Error

```json
{ "success": false, "error": "Missing required parameter: cddevc" }
```

---

## Error responses

| Status | สาเหตุ | ตัวอย่าง `error` |
|--------|--------|-------------------|
| 400 | parameter ที่ required ไม่ได้ส่งมา หรือส่งเป็นค่าว่าง | `Missing required parameter: cddevc` |
| 400 | parameter ไม่รู้จัก (รวม `limit`/`offset` ของ endpoint ที่ไม่แบ่งหน้า) | `Unknown parameter: extra` |
| 400 | parameter ส่งมาซ้ำ (`?a=1&a=2`) | `Parameter cddevc must be given exactly once` |
| 400 | ความยาวค่าเกิน `maxLength` | `Parameter cddevc exceeds 10 characters` |
| 400 | `limit` หรือ `offset` ไม่ใช่จำนวนเต็มหรือเกินขอบเขต | `limit must be between 1 and 500` |
| 404 | path ไม่มีในระบบ | `Route not found: GET /api/unknown` |
| 500 | error ที่ไม่คาดคิด | production: `Internal server error`, dev: ข้อความ error จริง |
| 429 | เรียกเกิน `RATE_LIMIT_MAX` ในช่วง `RATE_LIMIT_WINDOW_MS` | `Too many requests` |
| 503 | database ใช้งานไม่ได้ (เฉพาะ `/api/health`) | `Database unavailable` |
| 503 | คิว query เต็ม (`DB_QUEUE_MAX`) | `Server busy, try again later` |

ค่า `error` จาก 400 และ 404 เป็นข้อความที่ปลอดภัยต่อการแสดงผลให้ผู้ใช้เห็นได้

---

## ตัวอย่างการเรียกใช้งาน

ใน PowerShell ให้ใช้ `curl.exe` เพราะ `curl` เป็น alias ของ `Invoke-WebRequest`

```powershell
# Health
curl.exe -i http://localhost:3099/api/health

# MDVICE
curl.exe -i "http://localhost:3099/api/web/services/MDVICE?cddevc=11251"

# MDVICE ไม่ส่ง cddevc (400)
curl.exe -i "http://localhost:3099/api/web/services/MDVICE"

# WGPGBL
curl.exe -i http://localhost:3099/api/web/services/WGPGBL
```

ตัวอย่างใน JavaScript:

```javascript
const res = await fetch('http://localhost:3099/api/web/services/MDVICE?cddevc=11251');
const body = await res.json();
if (!res.ok) throw new Error(body.error);
if (body.P_ISFOUND === '1') console.log(body.rows[0]);
```
