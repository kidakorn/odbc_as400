# Endpoint Manager

คู่มือการใช้สคริปต์ [endpoint-manager.js](../scripts/endpoint-manager.js) สำหรับเพิ่ม ลบ แก้ไข และตรวจสอบ API endpoint
สคริปต์จะแก้ไขไฟล์ [endpoints.json](../src/endpoints/endpoints.json) โดยตรง และตรวจสอบ config ด้วย validator เดียวกับที่ server ใช้ตอนเริ่มทำงาน

## สรุปสั้น ๆ

```powershell
npm run endpoints -- list                             # ดูรายการ endpoint ทั้งหมด
npm run endpoints -- show <id>                        # ดูรายละเอียด endpoint หนึ่งรายการ
npm run endpoints -- validate                         # ตรวจ config โดยไม่แก้ไขไฟล์
npm run endpoints -- add --file <def.json>            # เพิ่ม endpoint
npm run endpoints -- update <id> --file <patch.json>  # แก้ไขบาง field
npm run endpoints -- remove <id> --yes                # ลบ endpoint
```

หลังเพิ่ม แก้ไข หรือลบ **ต้อง restart server** (`npm start`) จึงจะมีผล
เพราะ route ถูกลงทะเบียนตอน server เริ่มทำงาน

---

## ก่อนเริ่มใช้งาน

- Node.js 20 ขึ้นไป สคริปต์ไม่ต้องใช้ dependency เพิ่มเติม และไม่ต้องต่อ database
- รันคำสั่งจาก root ของโปรเจกต์ เพราะ `npm run endpoints` ต้องอยู่ใน folder ที่มี `package.json`
- ตัวอย่างทั้งหมดในคู่มือนี้ใช้ PowerShell และสมมติว่ามี folder `tmp\` สำหรับไฟล์ JSON ชั่วคราว (สร้างด้วย `New-Item -ItemType Directory tmp`)

---

## คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร | แก้ไขไฟล์ |
|--------|--------|-----------|
| `list` | แสดงตาราง ID, METHOD, PATH, PARAMS, DESCRIPTION | ไม่ |
| `show <id>` | แสดง endpoint หนึ่งรายการเป็น JSON | ไม่ |
| `validate` | ตรวจ config ทั้งไฟล์ตามกฎของ server | ไม่ |
| `add --file <def.json>` | เพิ่ม endpoint จากไฟล์ JSON | ใช่ |
| `update <id> --file <patch.json>` | แก้ไขเฉพาะ field ที่ระบุในไฟล์ | ใช่ |
| `remove <id> --yes` | ลบ endpoint ตาม id | ใช่ |

### Options

| Option | ใช้กับคำสั่ง | คำอธิบาย |
|--------|--------------|----------|
| `--file <path>` | `add`, `update` | path ของไฟล์ JSON นิยาม endpoint |
| `--config <path>` | ทุกคำสั่ง | ระบุไฟล์ endpoints อื่นแทน `src/endpoints/endpoints.json` |
| `--dry-run` | `add`, `update`, `remove` | ตรวจและแสดงผลลัพธ์ แต่ไม่เขียนไฟล์ |
| `--yes` | `remove` | ยืนยันการลบ (ถ้าไม่ใส่ คำสั่ง `remove` จะไม่ทำงาน) |
| `-h`, `--help` | ทุกคำสั่ง | แสดงวิธีใช้ |

Exit code: `0` สำเร็จ, `1` ผิดพลาด (ไฟล์จะไม่ถูกเขียนเมื่อผิดพลาด)

---

## รูปแบบไฟล์ JSON นิยาม endpoint

ใช้กับ `add` (ต้องมี field ที่ required ครบ) และ `update` (ใส่เฉพาะ field ที่ต้องการเปลี่ยน)

```json
{
  "id": "mdvice-by-name",
  "path": "/api/web/services/MDVICE/NAME",
  "description": "Search device master by device name",
  "sqlTemplate": "SELECT * FROM MDVICE WHERE NMDEVC = :nmdevc",
  "params": [
    { "name": "nmdevc", "required": true, "maxLength": 40 }
  ]
}
```

| Field | Required | ประเภท | กฎ |
|-------|----------|--------|-----|
| `id` | ใช่ | string | ต้องไม่ซ้ำกับ endpoint อื่น |
| `path` | ใช่ | string | ต้องขึ้นต้นด้วย `/api/` และต้องไม่ซ้ำกับ endpoint อื่น |
| `description` | ไม่ | string | คำอธิบายสำหรับคนอ่าน ไม่มีผลต่อการทำงาน |
| `sqlTemplate` | ใช่ | string | ต้องขึ้นต้นด้วย `SELECT` ห้ามมี `;` และห้ามมี keyword `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `CALL` |
| `params` | ไม่ | array | ถ้าไม่ระบุ ถือเป็น `[]` |
| `orderBy` | ไม่ | string | รายชื่อคอลัมน์ (คั่นด้วย `,`) พร้อม `ASC`/`DESC` ได้ ทำให้ endpoint แบ่งหน้าด้วย `limit`/`offset` ได้ ห้ามมี `ORDER BY` ใน `sqlTemplate` |
| `fetchAll` | ไม่ | boolean | `true` = ไม่จำกัดจำนวน row (ไม่มี `FETCH FIRST`) ใช้ร่วมกับ `orderBy` ไม่ได้ |

Field ของแต่ละ item ใน `params`:

| Field | Required | ประเภท | กฎ |
|-------|----------|--------|-----|
| `name` | ใช่ | string | ตัวอักษร ตัวเลข หรือ `_` และขึ้นต้นด้วยตัวอักษรหรือ `_` |
| `required` | ไม่ | boolean | ถ้า `true` และ client ไม่ส่งค่า (หรือส่งค่าว่าง) จะได้ 400 |
| `maxLength` | ไม่ | integer > 0 | ความยาวสูงสุดของค่าที่ client ส่งมา (default `100`) |

กฎเพิ่มเติม:

- ทุก `:name` ใน `sqlTemplate` ต้องประกาศใน `params`
- `params` ที่ไม่ required และ client ไม่ส่งค่า จะถูกผูกเป็น `NULL` ดังนั้น SQL ควรรองรับ `NULL` (เช่น `WHERE :x IS NULL OR ...`)
- ชื่อ field ที่ไม่รู้จัก (เช่น `sql` แทน `sqlTemplate`) จะถูกปฏิเสธ เพื่อกันการพิมพ์ผิดแล้วค่าหายเงียบ ๆ

---

## ตัวอย่างการใช้งาน

### 1. ดูรายการ endpoint

```powershell
npm run endpoints -- list
```

ตัวอย่างผลลัพธ์:

```
ID             METHOD  PATH                          PARAMS  DESCRIPTION
mdvice-by-key  GET     /api/web/services/MDVICE      cddevc  Get device master record by device code
wgpgbl-all     GET     /api/web/services/WGPGBL      -       Get all global setting/branch rows
```

`PARAMS` แสดง `name` สำหรับ param ที่ required และ `name?` สำหรับ param ที่ไม่ required

### 2. เพิ่ม endpoint

สร้างไฟล์นิยามก่อน (เช่น `tmp\new-endpoint.json`) แล้วตรวจแบบ dry-run:

```powershell
npm run endpoints -- add --file tmp\new-endpoint.json --dry-run
```

เมื่อผลลัพธ์ถูกต้องแล้ว ให้รันจริง แล้ว restart server ทดสอบ:

```powershell
npm run endpoints -- add --file tmp\new-endpoint.json
npm start
curl.exe -i "http://localhost:3099/api/web/services/MDVICE/NAME?nmdevc=ABC"
```

### 3. แก้ไข endpoint

ไฟล์ patch ใส่เฉพาะ field ที่ต้องการเปลี่ยน ตัวอย่างนี้แก้เฉพาะ description (`tmp\patch.json`):

```json
{ "description": "Search device master by device name (exact match)" }
```

```powershell
npm run endpoints -- update mdvice-by-name --file tmp\patch.json
```

ข้อควรระวัง:

- ถ้า patch มี `params` จะแทนที่ `params` ทั้งชุด ไม่ได้ merge รายตัว ต้องส่ง params ทั้งหมดที่ต้องการ
- ถ้า patch มี `id` ค่า `id` จะเปลี่ยน ซึ่งมีผลต่อการใช้ id ใน script นี้ (`show`, `update`, `remove`) แต่ไม่กระทบ URL ที่ client เรียกใช้

### 4. ลบ endpoint

```powershell
npm run endpoints -- remove mdvice-by-name --dry-run   # ดูผลก่อน
npm run endpoints -- remove mdvice-by-name --yes       # ลบจริง
```

### 5. ตรวจ config

```powershell
npm run endpoints -- validate
```

สำเร็จจะแสดง `OK: ... is valid` ถ้าไม่ผ่านจะแสดงรายการข้อผิดพลาดทั้งหมด เช่น

```
Error: Invalid endpoints config:
 - endpoint[1] (wgpgbl-all): sqlTemplate must start with SELECT
```

### 6. ทดลองกับไฟล์สำเนา

ใช้ `--config` เพื่อทดลองกับไฟล์สำเนาโดยไม่กระทบไฟล์จริง:

```powershell
Copy-Item src\endpoints\endpoints.json tmp\endpoints-test.json
npm run endpoints -- add --file tmp\new-endpoint.json --config tmp\endpoints-test.json
```

---

## ความปลอดภัยและการทำงานภายใน

- ทุกการเปลี่ยนแปลงผ่านการตรวจสอบด้วย `validateEndpoints` ก่อนเขียนไฟล์ ถ้าไม่ผ่าน ไฟล์จะไม่ถูกแก้ไข
- ไฟล์ถูกเขียนผ่านไฟล์ชั่วคราว `endpoints.json.tmp` แล้ว rename ทับ เพื่อไม่ให้ไฟล์เสียหายถ้าโปรแกรมถูกขัดจังหวะ
- ไฟล์ที่อ่านจาก `--file` หรือ `--config` ที่มี UTF-8 BOM (เช่นจาก PowerShell 5) รองรับแล้ว
- การบันทึกจะเขียน JSON ทั้งไฟล์ใหม่ (indent 2 space) ดังนั้นการจัดบรรทัดของ `params` ในไฟล์เดิมอาจเปลี่ยนรูปแบบในการ commit ครั้งแรก
- สคริปต์ไม่ได้เชื่อมต่อ database จึงไม่ตรวจว่า table หรือ column มีอยู่จริง ควรทดสอบ endpoint ใหม่ด้วย curl หลัง restart

---

## การทดสอบ

```powershell
npm test
```

ชุดทดสอบ [endpoint-manager.test.js](../test/endpoint-manager.test.js) ครอบคลุมการเพิ่ม แก้ไข ลบ และการปฏิเสธ input ที่ไม่ถูกต้อง โดยใช้ไฟล์สำเนาชั่วคราว ไม่แตะ `endpoints.json` จริง

---

## Troubleshooting

**`Error: Invalid endpoints config`**
อ่านรายการใต้ข้อความ error แต่ละบรรทัดระบุ `endpoint[index] (id)` และสาเหตุ แก้ไข JSON นิยามแล้วรันใหม่

**`Error: unknown field "..."`**
ชื่อ field พิมพ์ผิด ดูชื่อที่อนุญาตจากตารางด้านบน

**`Error: ... is not valid JSON`**
ไฟล์ JSON ไม่ถูกต้อง เช่น ลืม comma หรือใช้ single quote ตรวจด้วย `Get-Content tmp\new-endpoint.json | ConvertFrom-Json`

**`Error: No endpoint with id "..."`**
ดู id ที่มีด้วย `npm run endpoints -- list`

**`remove deletes ... re-run with --yes to confirm`**
คำสั่งลบต้องมี `--yes` ใช้ `--dry-run` เพื่อดูผลโดยไม่ลบ

**Server ยังตอบ endpoint เดิมหลังแก้ไข**
ยังไม่ได้ restart server ถ้าใช้ `npm run dev` (nodemon) จะ restart เองเมื่อไฟล์เปลี่ยน แต่ถ้าใช้ `npm start` ต้องหยุดแล้วเริ่มใหม่เอง

**Server ไม่ start หลังแก้ไข endpoint**
Server ตรวจ `endpoints.json` ตอนเริ่มทำงาน ถ้าไม่ผ่านจะหยุดทันที ให้รัน `npm run endpoints -- validate` เพื่อดูสาเหตุ
