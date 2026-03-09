# TASK 1 – Code Review & Critical Issue Analysis

## Findings (≥5 issues with severity, impact, fix, file+line)
### 1) Weak password policy (MinLength 6)  
**Severity:** Major  
**Where:** `@MinLength(6)` in registration DTO  
- Ref: `password!: string;`  

**Impact:** Short passwords are vulnerable to brute‑force/credential stuffing, lowering account security.  

**Exploit scenario:** Attacker tries common 6‑character passwords to take over accounts.  

**Fix direction:** Increase minimum length (>= 8/10), add complexity checks, or block weak passwords (haveibeenpwned).  

---

### 2) OTP code is logged + no rate limiting / brute‑force protection  
**Severity:** Major  
**Where:** [api-service/src/app/otp/otp.service.ts](cci:7://file:///Users/nguyenhoangkiet/Downloads/source/Interview/api-service/src/app/otp/otp.service.ts:0:0-0:0)  
- OTP logged: @api-service/src/app/otp/otp.service.ts#14-21  
- Verify logic without attempts/throttle: @api-service/src/app/otp/otp.service.ts#33-46  

**Impact:** Anyone with log access can read OTPs; unlimited brute force allows account takeover.  

**Exploit scenario:** Attacker loops OTP guesses (no throttle), or reads OTP from logs to bypass verification.  

**Fix direction:** Remove OTP logging; store hashed OTP; add rate limit per phone/IP; add attempt counter + lockout; expire old OTPs.

---

### 3) File uploads are public and unvalidated  
**Severity:** Major  
**Where:** [api-service/src/app/common/services/storage.service.ts](cci:7://file:///Users/nguyenhoangkiet/Downloads/source/Interview/api-service/src/app/common/services/storage.service.ts:0:0-0:0)  
- Public ACL: @api-service/src/app/common/services/storage.service.ts#37-45  

**Impact:** Sensitive uploads become publicly accessible; any user can upload arbitrary file types.  

**Exploit scenario:** Upload malware or sensitive data, then share public URL; legal/security liability.  

**Fix direction:** Default to **private** ACL, generate **signed URLs**, validate MIME + size + extension in upload pipeline.

---

### 4) No timeout / retry policy for auth refresh  
**Severity:** Minor  
**Where:** `authInterceptor` only handles 401 refresh, no timeout  
- Ref: @shared/src/lib/interceptors/auth.interceptor.ts#9-33  

**Impact:** If a request hangs, the UI can hang as well (no auto timeout), causing poor UX.  

**Exploit scenario:** API stalls or flaky network makes the client fail to fail‑fast, freezing the session.  

**Fix direction:** Set a global HTTP timeout and handle retry/backoff properly.  

---

### 5) Missing DB backup + centralized log shipping  
**Severity:** Major  
**Where:** No DB backup/log shipping observed in infra  

**Impact:** Data loss on DB incidents; difficult to investigate incidents due to missing centralized logs.  

**Exploit scenario:** Infrastructure failure causes production data loss with no recovery path.  

**Fix direction:** Set up scheduled backups and ship logs to S3 (or a centralized logging system).  

---

### 6) File upload interceptor has no size/type filters  
**Severity:** Major  
**Where:** [api-service/src/app/product/product.controller.ts](cci:7://file:///Users/nguyenhoangkiet/Downloads/source/Interview/api-service/src/app/product/product.controller.ts:0:0-0:0)  
- FilesInterceptor without limits: @api-service/src/app/product/product.controller.ts#33-41  

**Impact:** Large file upload can exhaust memory or disk; DoS risk.  

**Fix direction:** Add Multer limits + fileFilter (e.g., size, allowed MIME, max total size).

---

### 7) Missing `/api` reverse proxy in Nginx breaks frontend API calls  
**Severity:** Critical  
**Where:** `location /api/` in Nginx frontend config  
- Ref: @nginx/frontend.conf#13-20  

**Impact:** Frontend cannot reach backend APIs in production if the reverse proxy is not configured.  

**Exploit scenario:** Deployment without `/api` proxy causes all API calls to fail.  

**Fix direction:** Ensure `location /api/ { proxy_pass http://api-service:3000; ... }` is present in Nginx config.  

---

## Top 3 Most Critical Issues (Justification)
1) **Missing `/api` reverse proxy in Nginx (Critical)**  
Breaks all frontend API calls if not configured.  
Ref: @nginx/frontend.conf#13-20  

2) **OTP logged + no brute‑force limits (Major)**  
Bypasses identity verification, allows fake account creation or account hijack.  
Refs: @api-service/src/app/otp/otp.service.ts#14-21, #33-46  

3) **Public file uploads (Major)**  
Permanent data exposure + malware distribution via public URL.  
Ref: @api-service/src/app/common/services/storage.service.ts#37-45  

---

## CI/CD or Lint Rules to Prevent Recurrence (Nice‑to‑Have)
- Add OWASP Top 10 checklist into the AI review prompt rules (in `.github/scripts/ai-review.ts`, function `buildPrompt()` under **RULES** / `.github/AI_RULES.md` loading) and enforce it in CI:
  - **A01 – Broken Access Control**
  - **A02 – Cryptographic Failures**
  - **A03 – Injection**
  - **A04 – Insecure Design**
  - **A05 – Security Misconfiguration**
  - **A06 – Vulnerable and Outdated Components**
  - **A07 – Identification and Authentication Failures**
  - **A08 – Software and Data Integrity Failures**
  - **A09 – Security Logging and Monitoring Failures**
  - **A10 – Server‑Side Request Forgery (SSRF)**

---

## 1‑Week Sprint Plan (Nice‑to‑Have)
**Day 1–2:**  
- Fix OAuth flow (code exchange)  
- Add allow‑list for Host header  
- Enable CORS + adjust cookie SameSite  

**Day 3–4:**  
- Implement OTP throttling + attempt limits  
- Remove OTP logging  
- Hash OTP in DB  

**Day 5:**  
- Add upload validation + size limits  
- Default private ACL + signed URL  

**Day 6–7:**  
- Add security tests + CI checks  
- QA regression (login/register/OAuth/upload)  
- Add test plan: unit/integration/e2e for auth, OTP, uploads, and CORS