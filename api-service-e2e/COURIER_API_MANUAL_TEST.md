# Courier API Manual Test (Postman)

This guide mirrors the **courier e2e tests** and provides Postman-ready request data for manual testing.

## Prerequisites
- API running at `http://localhost:3000/api`
- PostgreSQL running and migrations applied
- Admin user exists (from seed):
  - Email: `admin@vhandelivery.com`
  - Password: `admin123`

## Postman Environment (suggested)
Create an environment with these variables:

```
BASE_URL = http://localhost:3000/api
ADMIN_EMAIL = admin@vhandelivery.com
ADMIN_PASSWORD = admin123
USER_EMAIL = courier_<timestamp>@example.com
USER_PASSWORD = Test1234!
USER_PHONE = 090<random>
USER_NAME = courier_<timestamp>
COURIER_NAME = Courier <timestamp>
COURIER_ID =
VERIFICATION_TOKEN =
ADMIN_TOKEN =
USER_TOKEN =
```

## Postman Pre-request Script (auto values)
Add this script at **Collection → Pre-request Script** to generate unique values.

```javascript
const timestamp = Date.now().toString();
const rand7 = Math.floor(1000000 + Math.random() * 9000000).toString();

pm.collectionVariables.set('timestamp', timestamp);
pm.collectionVariables.set('rand7', rand7);
pm.collectionVariables.set('USER_EMAIL', `courier_${timestamp}@example.com`);
pm.collectionVariables.set('USER_NAME', `courier_${timestamp}`);
pm.collectionVariables.set('USER_PHONE', `090${rand7}`);
pm.collectionVariables.set('COURIER_NAME', `Courier ${timestamp}`);
```

> Tip: Use Postman Pre-request Script to generate random values if needed.

## 1) Admin Login
**POST** `{{BASE_URL}}/auth/login`

**Body (JSON)**
```json
{
  "email": "{{ADMIN_EMAIL}}",
  "password": "{{ADMIN_PASSWORD}}"
}
```

**Save token**: `ADMIN_TOKEN = response.access_token`

---

## 2) User Register (for courier)
**POST** `{{BASE_URL}}/auth/register`

**Body (JSON)**
```json
{
  "email": "{{USER_EMAIL}}",
  "password": "{{USER_PASSWORD}}",
  "username": "{{USER_NAME}}",
  "phone": "{{USER_PHONE}}"
}
```

---

## 3) User Login
**POST** `{{BASE_URL}}/auth/login`

**Body (JSON)**
```json
{
  "email": "{{USER_EMAIL}}",
  "password": "{{USER_PASSWORD}}"
}
```

**Save token**: `USER_TOKEN = response.access_token`

---

## 4) Request OTP (Courier)
**POST** `{{BASE_URL}}/couriers/otp/request`

**Body (JSON)**
```json
{
  "phone": "{{USER_PHONE}}"
}
```

---

## 5) Verify OTP (Courier)
You need OTP code from DB or server log `[OTP-DEBUG]`.

**POST** `{{BASE_URL}}/couriers/otp/verify`

**Body (JSON)**
```json
{
  "phone": "{{USER_PHONE}}",
  "code": "<OTP_CODE>"
}
```

**Save token**: `VERIFICATION_TOKEN = response.verificationToken`

---

## 6) Register Courier (Happy)
**POST** `{{BASE_URL}}/couriers/register`

**Headers**
```
Authorization: Bearer {{USER_TOKEN}}
```

**Body (JSON)**
```json
{
  "name": "{{COURIER_NAME}}",
  "phone": "{{USER_PHONE}}",
  "verificationToken": "{{VERIFICATION_TOKEN}}"
}
```

**Expected**: `approvalStatus = PENDING` and `id` returned.

**Save**: `COURIER_ID = response.id`

---

## 7) Approve Courier (Admin)
**PATCH** `{{BASE_URL}}/couriers/{{COURIER_ID}}/approve`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Body**: empty `{}`

**Expected**: `approvalStatus = APPROVED`

---

## 8) Reject Courier (Admin)
**PATCH** `{{BASE_URL}}/couriers/{{COURIER_ID}}/reject`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Body (JSON)**
```json
{
  "reason": "Incomplete documents"
}
```

**Expected**: `approvalStatus = REJECTED`, `rejectionReason` set

---

## 9) Admin Create Courier
**POST** `{{BASE_URL}}/couriers/admin-create`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Body (JSON)**
```json
{
  "userId": <USER_ID_FROM_DB>,
  "name": "Admin Courier",
  "phone": "092<random>"
}
```

**Expected**: `approvalStatus = APPROVED` and `id`

---

## 10) List Couriers (Search)
**GET** `{{BASE_URL}}/couriers?search={{USER_PHONE}}`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected**: list includes the courier

---

## 11) Get Courier By ID
**GET** `{{BASE_URL}}/couriers/{{COURIER_ID}}`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

---

## 12) Update Courier
**PATCH** `{{BASE_URL}}/couriers/{{COURIER_ID}}`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Body (JSON)**
```json
{
  "name": "Courier Updated"
}
```

---

## 13) Delete Courier
**DELETE** `{{BASE_URL}}/couriers/{{COURIER_ID}}`

**Headers**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected**: `{ "message": "Courier deleted successfully" }`

---

# Failed / Edge Cases (Manual)

## A) OTP verify invalid code
**POST** `{{BASE_URL}}/couriers/otp/verify`

```json
{
  "phone": "{{USER_PHONE}}",
  "code": "000000"
}
```
**Expected**: 400 `Invalid or expired OTP`

## B) Register courier with invalid verification token
**POST** `{{BASE_URL}}/couriers/register`

**Headers**
```
Authorization: Bearer {{USER_TOKEN}}
```

```json
{
  "name": "Invalid Token Courier",
  "phone": "{{USER_PHONE}}",
  "verificationToken": "invalid-token"
}
```
**Expected**: 401 `Invalid or expired verification token`

## C) Non-admin approve/reject
Use `USER_TOKEN` to call approve/reject.
**Expected**: 403 `Access Denied`

## D) Idempotent approve/reject
Call approve twice or reject twice.
**Expected**: second call returns unchanged status.

---

# Cleanup
Delete couriers created from tests using **DELETE** endpoint. If needed, remove test users directly in DB.
