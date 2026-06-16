# TASK: Bulk Employee Import Feature
# Payroll Management System

---

## CONTEXT (read before starting)

- Stack: React + Vite + TailwindCSS (Frontend), Node.js + Express (Backend), MongoDB + Mongoose, JWT Auth
- DO NOT touch existing employee CRUD, auth, or any payroll logic
- Reuse existing axios instance, auth middleware, TailwindCSS patterns
- All API responses must follow: `{ success: true, data: ... }` or `{ success: false, message: ... }`

---

## CORRECT PAYROLL FORMULA (for reference, do not change)

```
Gross      = Basic + HRA + Other Fixed Allowances
Deductions = PF% of Gross + ESI% of Gross + PT (fixed)
Additions  = Shift Allowance + OT Amount  ← POST-deduction
Net Pay    = Gross - Deductions + Additions
```

---

## EMPLOYEE FIELDS (must match existing Employee model exactly)

| Excel Column   | DB Field     | Required |
|----------------|--------------|----------|
| Employee ID    | employeeId   | ✅ Yes   |
| Full Name      | name         | ✅ Yes   |
| Department     | departmentId | ✅ Yes   |
| Designation    | designation  | ✅ Yes   |
| Joining Date   | joiningDate  | ✅ Yes   |
| Basic Salary(₹)| basicSalary  | ✅ Yes   |
| PF Number      | pfNumber     | ❌ No    |
| ESI Number     | esiNumber    | ❌ No    |

> Department column mein HR department **name** likhega.
> Backend name se departmentId resolve karega automatically.

---

## PACKAGES TO INSTALL (backend only)

```bash
npm install exceljs multer
```

---

## TASK LIST (complete one by one, wait for confirmation after each)

---

### TASK 1 — Backend: Install Packages

```bash
npm install exceljs multer
```

Confirm installed successfully then move to Task 2.

---

### TASK 2 — Backend: Download Template Endpoint

**File:** `routes/employee.route.js` (add to existing file)
**File:** `controllers/employee.controller.js` (add new function)

**Endpoint:** `GET /api/employees/template`
Protected by existing JWT middleware.

**Logic:**
- Use ExcelJS to generate `.xlsx` file in memory (do NOT save to disk)
- Sheet name: `"Employees"`
- Row 1: Bold headers, background color `#1E40AF` (blue), white text
- Columns in exact order:
  ```
  A: Employee ID
  B: Full Name
  C: Department
  D: Designation
  E: Joining Date
  F: Basic Salary(₹)
  G: PF Number
  H: ESI Number
  ```
- Row 2: One example row with dummy data:
  ```
  EMP001 | Ramesh Kumar | Production | Operator | 01-06-2024 | 25000 | PF001234 | ESI005678
  ```
- Column widths: A=15, B=25, C=20, D=20, E=15, F=18, G=15, H=15
- Add cell note on E1: `"Format: DD-MM-YYYY"`
- Send as downloadable file:
  ```
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="employee_import_template.xlsx"
  ```

---

### TASK 3 — Backend: Upload & Validate Endpoint

**File:** `controllers/employee.controller.js` (add new function)
**File:** `routes/employee.route.js` (add new route)

**Endpoint:** `POST /api/employees/bulk-import`
- Middleware: multer (memory storage, `.xlsx` only, max 5MB)
- Protected by existing JWT middleware

**Logic:**
1. Parse uploaded Excel using ExcelJS
   - Skip Row 1 (headers)
   - Skip Row 2 (example row)
   - Start reading from Row 3
2. Fetch all active departments from DB → build map:
   ```js
   { "Production": ObjectId, "IT": ObjectId, ... }
   ```
3. Fetch all existing employeeIds from DB → build a Set for duplicate check
4. Track employeeIds seen within the uploaded file to catch in-file duplicates
5. For each row validate:
   - `employeeId`: required, not duplicate in DB, not duplicate within file
   - `name`: required, not empty
   - `department`: required, must exist in departments map → resolve to departmentId
   - `designation`: required, not empty
   - `joiningDate`: required, valid date, format DD-MM-YYYY
   - `basicSalary`: required, must be positive number
   - `pfNumber`: optional
   - `esiNumber`: optional
6. Build two arrays:
   ```js
   valid: [{ employeeId, name, departmentId, designation,
             joiningDate, basicSalary, pfNumber, esiNumber }]

   errors: [{ row: Number, employeeId: String, name: String,
              errors: ["Department not found", "Invalid salary"] }]
   ```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": [...],
    "errors": [...],
    "summary": {
      "total": 150,
      "valid": 147,
      "errorCount": 3
    }
  }
}
```

**Error cases:**
- Non `.xlsx` file → `{ success: false, message: "Only .xlsx files are accepted" }`
- File > 5MB → `{ success: false, message: "File size must be under 5MB" }`
- Empty file / no data rows → `{ success: false, message: "No data found in file" }`

---

### TASK 4 — Backend: Confirm Import Endpoint

**File:** `controllers/employee.controller.js` (add new function)
**File:** `routes/employee.route.js` (add new route)

**Endpoint:** `POST /api/employees/bulk-import/confirm`
**Body:** `{ employees: [ array of valid employee objects from Task 3 ] }`
Protected by existing JWT middleware.

**Logic:**
1. Re-validate employeeIds against DB (safety check — user may have waited long)
2. Filter out any that became duplicates since last validation
3. `Employee.insertMany(employees, { ordered: false })`
4. Return:
```json
{
  "success": true,
  "data": {
    "imported": 147,
    "message": "147 employees imported successfully"
  }
}
```

---

### TASK 5 — Frontend: Bulk Import Page

**File:** `src/pages/BulkImport.jsx` (new file)
**Route:** `/bulk-import`

Page has 3 states — manage with `useState`:

---

#### STATE 1 — Upload Screen (default state)

```
┌─────────────────────────────────────────────────┐
│  Bulk Employee Import                           │
│                                                 │
│  ℹ️  Download the template, fill your employee  │
│     data, then upload to import in bulk.        │
│                                                 │
│  [📥 Download Template]                         │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │   📂 Click to upload or drag & drop       │  │
│  │   Accepts .xlsx files only · Max 5MB      │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- Download Template button → `GET /api/employees/template` → triggers file download
- File input: `accept=".xlsx"` only
- On file select → automatically call `POST /api/employees/bulk-import`
- Show loading spinner with text: `"Validating your file..."`
- On error → show red error message, stay on State 1

---

#### STATE 2 — Preview Screen (after successful validation)

```
┌─────────────────────────────────────────────────┐
│  Import Preview                                 │
│                                                 │
│  ✅ 147 Valid   ❌ 3 Errors   📊 150 Total      │
│                                                 │
│  ┌────┬────────────┬──────────────┬──────────┬──────────────┬──────────────────────┐ │
│  │ Row│ Emp ID     │ Full Name    │ Dept     │ Basic Salary │ Status               │ │
│  ├────┼────────────┼──────────────┼──────────┼──────────────┼──────────────────────┤ │
│  │  3 │ EMP001     │ Ramesh Kumar │ Production│ ₹25,000     │ ✅ Ready             │ │
│  │  4 │ EMP002     │ Suresh Singh │ IT       │ ₹30,000      │ ✅ Ready             │ │
│  │  5 │ EMP003     │ Amit Verma   │ —        │ ₹28,000      │ ❌ Dept not found    │ │
│  └────┴────────────┴──────────────┴──────────┴──────────────┴──────────────────────┘ │
│                                                 │
│  ⚠️  Error rows will be skipped.               │
│     Fix them in Excel and re-upload.            │
│                                                 │
│  [✅ Import 147 Valid Employees]  [❌ Cancel]   │
└─────────────────────────────────────────────────┘
```

- Valid rows → green left border on table row
- Error rows → red left border, error reason in Status column
- Import button → `POST /api/employees/bulk-import/confirm` with valid array
- Cancel → reset to State 1
- Show loading spinner on Import button click

---

#### STATE 3 — Success Screen

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              ✅                                 │
│   147 Employees Imported Successfully           │
│                                                 │
│   [View All Employees]   [Import More]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

- View All Employees → `navigate('/employees')`
- Import More → reset to State 1

---

### TASK 6 — Frontend: Sidebar + Route Update

**File:** `src/components/Sidebar.jsx`
- Add new link: `"Bulk Import"`
- Route: `/bulk-import`
- Use an upload/import icon (consistent with existing icon style)
- Place it directly under the existing `"Employees"` nav link

**File:** `src/App.jsx`
- Import `BulkImport` page
- Add route:
  ```jsx
  <Route path="/bulk-import" element={<BulkImport />} />
  ```

---

## CONSTRAINTS (never violate)

- Use `ExcelJS` for template generation AND file parsing (backend only)
- Use `Multer` with memory storage — do NOT save files to disk
- Accept `.xlsx` only — reject `.xls` and `.csv` with a clear error message
- Max file size: 5MB
- Never import error rows — only confirmed valid rows go to DB
- Do NOT use SheetJS on frontend — backend handles all Excel logic
- No new UI libraries — TailwindCSS only
- All routes protected by existing JWT middleware

---

## IMPLEMENTATION ORDER (strict)

| # | Task | File(s) |
|---|------|---------|
| 1 | Install packages | terminal |
| 2 | Download template endpoint | employee.controller.js, employee.route.js |
| 3 | Upload & validate endpoint | employee.controller.js, employee.route.js |
| 4 | Confirm import endpoint | employee.controller.js, employee.route.js |
| 5 | Bulk Import page (all 3 states) | src/pages/BulkImport.jsx |
| 6 | Sidebar + App route update | Sidebar.jsx, App.jsx |

> ⚠️ Complete one task at a time.
> Wait for confirmation before moving to the next task.
