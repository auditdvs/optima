# 🔧 DEBUG Component Access Control

## Langkah Testing & Debugging:

### 1. Buka Browser Console (F12)

- Buka **Database** page (PullRequestPage)
- Tekan **F12** untuk buka Developer Tools
- Pilih tab **Console**

### 2. Klik Tab "Db Loan and Saving"

Lihat di console, seharusnya ada log seperti ini:

```
[ComponentAccess] Checking db_loan_saving: {
  component_name: "db_loan_saving",
  is_enabled: true,
  is_24_hours: false,  // ← HARUS false kalau custom time
  currentTime: "09:43:00",  // ← Waktu sekarang
  currentMinutes: 583,  // ← 9*60 + 43 = 583 menit
  start_time: "10:00:00",  // ← Jam mulai
  startMinutes: 600,  // ← 10*60 = 600 menit
  end_time: "17:00:00",
  endMinutes: 1020,
  timezone: "Asia/Jakarta"
}
```

### 3. Analisa Hasil:

**JIKA `is_24_hours: true`** → **INI MASALAHNYA!**

- Artinya data di database masih 24 hours = true
- Padahal di UI toggle sudah OFF (Custom)
- **Solusi**: Toggle harus benar-benar save ke database

**JIKA `is_24_hours: false` TAPI `currentMinutes < startMinutes`**

- Artinya logic sudah benar
- Jam 09:43 (583 menit) < jam 10:00 (600 menit)
- **Seharusnya BLOCKED!**
- Jika masih bisa akses → bug di ComponentAccessGuard render

**JIKA tidak ada log sama sekali:**

- ComponentAccessGuard tidak di-render
- Atau ada error di supabase query

### 4. Cek Database Langsung

Buka **Supabase SQL Editor**, jalankan:

```sql
SELECT
  component_name,
  display_name,
  is_enabled,
  is_24_hours,
  start_time,
  end_time
FROM component_access_control
WHERE component_name = 'db_loan_saving';
```

**Expected Result (Custom 10:00-17:00):**

- `is_enabled` = `TRUE`
- `is_24_hours` = `FALSE` ← **HARUS false!**
- `start_time` = `10:00:00`
- `end_time` = `17:00:00`

### 5. Jika is_24_hours masih TRUE di database:

**Problem**: Toggle di UI tidak save ke database!

**Quick Fix via SQL:**

```sql
UPDATE component_access_control
SET is_24_hours = FALSE
WHERE component_name = 'db_loan_saving';
```

Lalu **refresh halaman** dan test lagi.

---

## Expected Behavior:

### Jam 09:43 (SEKARANG) dengan setting 10:00-17:00:

✅ **ComponentAccessGuard** harus render pesan:

```
🔴 Access Restricted

Db Loan and Saving is only available between
10:00 - 17:00 (Asia/Jakarta)

⏰ Next Available
Kamis, 10 Oktober 2025 10:00

[Check Again]
```

### Setelah Jam 10:00:

✅ **ComponentAccessGuard** render children (DbLoanSaving component normal)
✅ Button "Request Data" bisa diklik

---

## KASIH TAU HASIL NYA:

1. Apa yang muncul di **Browser Console**?
2. Apa hasil query **Supabase SQL**?
3. Screenshot error kalau ada
