# Risk Profile: Lucatris User Login Validation

**Document ID:** RISK-2026-01-26-001
**Test Architect:** Quinn (QA Agent)
**Date:** 2026-01-26
**Status:** Active

---

## 1. Executive Summary

This risk profile assesses the quality and reliability of user authentication for the Lucatris system based on bulk validation testing of 77 QIMS Regulatory users. The overall risk level is **MEDIUM** due to 5 users being unable to access the system.

---

## 2. Risk Assessment Matrix

### 2.1 Overall Risk Score

| Dimension | Score (1-5) | Weight | Weighted Score |
|-----------|-------------|--------|----------------|
| Probability of Failure | 2 | 30% | 0.6 |
| Business Impact | 4 | 40% | 1.6 |
| Data Quality | 3 | 20% | 0.6 |
| Technical Complexity | 2 | 10% | 0.2 |
| **Total Risk Score** | | | **3.0 (MEDIUM)** |

### 2.2 Risk Level Definitions

| Level | Score Range | Description |
|-------|-------------|-------------|
| LOW | 1.0 - 2.0 | Acceptable risk, proceed with standard monitoring |
| MEDIUM | 2.1 - 3.5 | Elevated risk, requires mitigation before full deployment |
| HIGH | 3.6 - 4.5 | Significant risk, requires immediate attention |
| CRITICAL | 4.6 - 5.0 | Unacceptable risk, stop and remediate |

---

## 3. Identified Risks

### RISK-001: User Access Denial

| Attribute | Value |
|-----------|-------|
| **Risk ID** | RISK-001 |
| **Category** | Access Control |
| **Description** | 5 users (6.5%) cannot access Lucatris due to missing accounts |
| **Probability** | HIGH (100% - already occurring) |
| **Impact** | HIGH - Users cannot perform regulatory work |
| **Risk Score** | **4.0 (HIGH)** |

**Affected Users:**

| # | Name | Role | Branch | Business Impact |
|---|------|------|--------|-----------------|
| 1 | Boby Safra Madona | Inspector | Batam | Cannot perform inspections |
| 2 | Erizal | Admin Proj | Batam | Cannot manage projects |
| 3 | Mashudi | Inspector | Batam | Cannot perform inspections |
| 4 | Rizky Bahtiar Sidiq | - | Jakarta | Role-specific impact |
| 5 | Andika Bagas Rismawan | - | Jakarta | Role-specific impact |

**Mitigation:**
- **Action:** Create user accounts in Lucatris system
- **Owner:** System Administrator
- **Timeline:** Immediate (before next business day)
- **Residual Risk:** LOW (after mitigation)

---

### RISK-002: Data Quality Issues

| Attribute | Value |
|-----------|-------|
| **Risk ID** | RISK-002 |
| **Category** | Data Integrity |
| **Description** | Email addresses in source CSV do not match Lucatris records |
| **Probability** | MEDIUM (5 occurrences found) |
| **Impact** | MEDIUM - Users locked out until data corrected |
| **Risk Score** | **3.0 (MEDIUM)** |

**Root Causes:**
1. Manual data entry errors (typos)
2. Different email domains used (radiant.com vs radiant-utama.com)
3. No validation against authoritative source (ERP/AD)

**Mitigation:**
- **Action:** Implement automated email validation against ERP
- **Owner:** IT Team
- **Timeline:** 2 weeks
- **Residual Risk:** LOW (after validation implemented)

---

### RISK-003: Branch-Specific Access Gaps

| Attribute | Value |
|-----------|-------|
| **Risk ID** | RISK-003 |
| **Category** | Operational |
| **Description** | Batam branch has highest failure rate (27.3%) |
| **Probability** | MEDIUM |
| **Impact** | MEDIUM - Regional operations affected |
| **Risk Score** | **2.5 (MEDIUM)** |

**Branch Analysis:**

| Branch | Pass Rate | Risk Level |
|--------|-----------|------------|
| Batam | 72.7% | HIGH |
| Jakarta | 96.1% | LOW |
| Surabaya | 100% | NONE |
| Duri | 100% | NONE |

**Mitigation:**
- **Action:** Prioritize Batam user account provisioning
- **Owner:** Regional IT Coordinator
- **Timeline:** Immediate
- **Residual Risk:** LOW

---

### RISK-004: Recurring Data Synchronization

| Attribute | Value |
|-----------|-------|
| **Risk ID** | RISK-004 |
| **Category** | Process |
| **Description** | No automated sync between user list and Lucatris |
| **Probability** | HIGH (manual process prone to errors) |
| **Impact** | MEDIUM - Future users may face same issues |
| **Risk Score** | **3.5 (MEDIUM)** |

**Mitigation:**
- **Action:** Implement automated user provisioning sync
- **Owner:** Development Team
- **Timeline:** 1 month
- **Residual Risk:** LOW

---

## 4. Risk Heat Map

```
                    IMPACT
           Low    Medium    High    Critical
         +-------+--------+--------+---------+
Critical |       |        |        |         |
         +-------+--------+--------+---------+
High     |       |        | R-001  |         |  P
         +-------+--------+--------+---------+  R
Medium   |       | R-003  | R-002  |         |  O
         +-------+--------+--------+---------+  B
Low      |       |        | R-004  |         |  A
         +-------+--------+--------+---------+  B

Legend: R-001 = User Access Denial, R-002 = Data Quality
        R-003 = Branch Gaps, R-004 = Sync Issues
```

---

## 5. Risk Mitigation Plan

### Immediate Actions (0-24 hours)

| # | Action | Owner | Status |
|---|--------|-------|--------|
| 1 | Create accounts for 5 failed users | Sys Admin | PENDING |
| 2 | Verify Batam branch user list | Regional IT | PENDING |
| 3 | Retest failed users after provisioning | QA Team | PENDING |

### Short-Term Actions (1-2 weeks)

| # | Action | Owner | Status |
|---|--------|-------|--------|
| 1 | Implement email validation in provisioning | IT Team | PLANNED |
| 2 | Document user provisioning SOP | Process Owner | PLANNED |
| 3 | Create user access audit report | QA Team | PLANNED |

### Long-Term Actions (1+ month)

| # | Action | Owner | Status |
|---|--------|-------|--------|
| 1 | Implement automated user sync | Dev Team | PLANNED |
| 2 | Schedule monthly access validation | QA Team | PLANNED |
| 3 | Integrate with Active Directory | IT Team | PLANNED |

---

## 6. Risk Monitoring

### Key Risk Indicators (KRIs)

| KRI | Threshold | Current | Status |
|-----|-----------|---------|--------|
| Login Success Rate | >= 95% | 93.5% | WARNING |
| Users Without Access | 0 | 5 | ALERT |
| Data Quality Errors | < 2% | 6.5% | ALERT |
| Branch Coverage | 100% | 100% | OK |

### Monitoring Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| User access validation | Monthly | QA Team |
| Data quality audit | Bi-weekly | IT Team |
| Risk review meeting | Weekly (until resolved) | QA Lead |

---

## 7. Contingency Plan

### If User Account Creation Delayed

1. **Escalate** to IT Management
2. **Workaround:** Provide temporary shared account (if policy allows)
3. **Communication:** Notify affected users and their managers
4. **Timeline:** Escalate if not resolved within 48 hours

### If Data Quality Issues Persist

1. **Root Cause Analysis:** Identify source of incorrect data
2. **Data Cleansing:** Manual verification of all user emails
3. **Process Change:** Implement mandatory email verification step

---

## 8. Stakeholder Communication

### Risk Communication Matrix

| Stakeholder | Communication | Frequency |
|-------------|---------------|-----------|
| IT Management | Risk summary + actions | Immediate |
| Regional Managers | Affected user list | Immediate |
| QA Team | Full risk profile | Upon creation |
| Development Team | Technical actions | As needed |

---

## 9. Acceptance Criteria for Risk Closure

| Risk | Closure Criteria | Target Date |
|------|------------------|-------------|
| RISK-001 | All 5 users can login successfully | 2026-01-27 |
| RISK-002 | Email validation implemented | 2026-02-09 |
| RISK-003 | Batam pass rate >= 95% | 2026-01-27 |
| RISK-004 | Automated sync operational | 2026-02-26 |

---

## 10. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Test Architect | Quinn (QA Agent) | [DIGITAL] | 2026-01-26 |
| Risk Owner | Pending | | |
| Approver | Pending | | |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26T14:35:00Z
**Next Review:** 2026-01-27

