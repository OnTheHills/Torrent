# Dependency Update and Vulnerability Remediation Policy

**Policy effective:** November 22, 2026  
**Owner:** Project maintainer  
**Project:** TORRENT  
**Environment:** Local development and university assessment

## 1. Purpose

This policy defines how the TORRENT project reviews, updates, and maintains software dependencies to reduce security vulnerabilities.

It supports the following OWASP ASVS 5.0 requirements:

- **V15.1.1 (L1):** Document appropriate timeframes for updating third-party components and remediating known vulnerabilities.
- **V15.2.1 (L1):** Verify that application components have not exceeded the documented update and remediation timeframes.

This policy is designed for a university project that operates in a local development environment and is not intended for public deployment.

## 2. Dependency Update Policy

TORRENT does not require every dependency to be updated to its latest version.

An older dependency may continue to be used if:

- It has no known, applicable security vulnerabilities requiring remediation.
- It remains suitable for its intended purpose.
- It is compatible with the application.
- Its maintenance and support status have been considered.
- Any significant security risks have been documented and addressed.

A newer version being available does not automatically require an update.

Dependencies should be updated when:

1. A known vulnerability affects the application and requires remediation.
2. A component is no longer supported and presents an unacceptable security risk.
3. An update is necessary to maintain compatibility or correct a security-related issue.
4. The project maintainer determines that an update is appropriate.

Updates should be assessed for potential compatibility issues before being applied.

## 3. Dependency Review Schedule

Dependencies will be reviewed at the following times:

| Activity | Review timeframe |
|---|---|
| Initial dependency assessment | Before completing the ASVS security assessment |
| Routine dependency review | At least once every 60 days while the project is actively maintained |
| New dependency installation | Before adding the dependency |
| Known security vulnerability | When identified or reported |
| Major dependency update | When required for security, compatibility, or maintenance |
| Before final university submission | Perform a final dependency security review |

The review covers:

- Frontend dependencies (Next.js and related packages).
- Backend dependencies (Express.js and related packages).
- Direct and transitive npm dependencies.
- Node.js, MongoDB, and Docker container base images where applicable.

Development dependencies should also be reviewed, with their actual security exposure considered.

## 4. Vulnerability Remediation Timeframes

Known vulnerabilities will be evaluated based on severity, exploitability, affected functionality, and application exposure.

Because TORRENT is a local university project, its operating environment may be considered when determining actual risk. However, local-only operation does not automatically make a vulnerability harmless.

| Severity | Remediation timeframe |
|---|---|
| Critical | Within 14 calendar days |
| High | Within 30 calendar days |
| Moderate | Within 60 calendar days |
| Low | Within 90 calendar days |

These timeframes begin when the project team identifies an applicable vulnerability.

If a vulnerability is actively exploited or poses an immediate serious risk to the application, the affected functionality should be restricted or disabled as soon as practical.

A finding may be assessed as lower risk when there is documented evidence that the vulnerable functionality is unreachable, disabled, or not applicable to TORRENT.

Severity reassessments must include a written explanation.

## 5. Vulnerability Remediation Methods

Depending on the situation, the project maintainer may:

1. Update the affected package to a secure version.
2. Replace the package with a maintained alternative.
3. Remove the package if it is unnecessary.
4. Disable the vulnerable functionality.
5. Apply an appropriate workaround or compensating control.
6. Document a temporary exception when immediate remediation is not feasible.

Major-version upgrades are not mandatory unless needed to address a relevant security issue or an unacceptable support risk.

If no upstream fix is available, the project maintainer should document the risk and available mitigation options.

## 6. Exceptions

An exception may be granted when a dependency cannot reasonably be updated or replaced.

Valid reasons may include:

- Compatibility with an external system.
- No secure replacement currently available.
- The affected functionality is not reachable.
- The vulnerability is not exploitable in the application's current configuration.
- Updating the component would cause disproportionate disruption relative to the documented risk.

Each exception should record:

- Affected component and version.
- Reason for the exception.
- Security risk and application exposure.
- Any compensating controls.
- Approval by the project maintainer.
- Review or expiration date.

Exceptions should be reviewed during the next scheduled dependency review and must not be treated as permanent exemptions without reassessment.

### Legacy e-GP Compatibility

TORRENT uses the `evp_bytestokey` dependency for compatibility with the external e-GP project URL format.

This dependency should be assessed for known vulnerabilities and maintenance concerns.

If replacement would break compatibility with the external system, its continued use may be documented as an exception after reviewing the associated risks.

This exception does not automatically establish compliance with separate cryptographic requirements.

## 7. Dependency Security Verification

The project maintainer will use dependency auditing tools to identify known vulnerabilities and available updates.

Run the following commands from the repository root:

```bash
npm --prefix backend audit
npm --prefix backend outdated

npm --prefix frontend audit
npm --prefix frontend outdated
```

The results should be reviewed to determine:

- Whether known vulnerabilities exist.
- Which components are affected.
- Whether the vulnerable functionality is used.
- Whether an appropriate fix is available.
- Whether the remediation deadline has been exceeded.

An outdated package is not automatically considered a security vulnerability.

For Node.js, MongoDB, and container images, version and support information should be reviewed using relevant vendor documentation or security advisories.

After updating dependencies, relevant tests and builds should be run to verify application functionality.

Avoid using `npm audit fix --force` without reviewing the proposed changes.

## 8. Security Review Records

Maintain a simple record of identified vulnerabilities and relevant dependency issues.

| Field | Description |
|---|---|
| Component | Dependency or runtime name |
| Version | Installed version |
| Issue | Vulnerability or support concern |
| Severity | Critical, High, Moderate, Low |
| Discovery date | Date identified |
| Deadline | Required remediation date |
| Action | Update, remove, mitigate, or exception |
| Status | Open, Resolved, or Accepted Exception |
| Evidence | Audit output, tests, or review notes |

Detailed records are required primarily for dependencies with known vulnerabilities, support problems, or approved exceptions. A complete dependency inventory may be generated from lockfiles and runtime version information.

## 9. ASVS Compliance Assessment

Architecture documentation for V15.1 (including SBOM location and resource-demanding functionality) is centralized in [Secure-Coding-Architecture.md](./Secure-Coding-Architecture.md).

### V15.1.1 — Dependency Update Documentation

This requirement may be marked **Passed** when:

- The dependency update policy is documented.
- Security remediation timeframes are defined.
- The policy has been reviewed and adopted by the project maintainer.

### V15.1.2 — Third-Party Inventory / SBOM

This requirement may be marked **Passed** when:

- CycloneDX SBOMs exist under [sbom/](./sbom/) for backend and frontend lockfiles.
- Trusted repository policy is documented (default `registry.npmjs.org`).
- Direct dependency catalogs are listed in Secure-Coding-Architecture.md.
- SBOMs are regenerated after intentional dependency changes (`./scripts/generate-sbom.sh`).

### V15.2.1 — Dependency Compliance Verification

This requirement may be marked **Passed** when:

- The installed components have been reviewed.
- Applicable vulnerabilities and support issues have been assessed.
- No component has exceeded the documented remediation deadline without an effective resolution or appropriately assessed exception.
- Relevant verification evidence has been recorded.

The existence of this policy alone does not establish V15.2.1 compliance.

## 10. Policy Review

This policy will be reviewed when:

- A significant security concern is identified.
- The project's technology stack changes substantially.
- The project moves toward public deployment.
- The project continues into a new university assessment period.

Any policy changes must be documented and must not be used retroactively to conceal overdue security findings.