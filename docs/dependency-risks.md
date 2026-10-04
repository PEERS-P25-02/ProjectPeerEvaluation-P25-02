# Dependency Risks

## Nodemailer

The backend's earlier npm audit report identified Nodemailer as a **high-severity vulnerable dependency**. The report listed the affected range as `<=10.0.5`, meaning versions less than or equal to 10.0.5 were affected. Remediation required a version **greater than 10.0.5**; npm proposed Nodemailer **10.0.14**.

The backend was upgraded from Nodemailer 7.x to **10.0.14**. This crosses major versions, so focused email compatibility tests were added using Node's built-in test runner.

**Status: dependency finding resolved; live SMTP verification pending.** On 2026-10-04, the developer reported a successful upgrade, **8 passing tests**, and **0 known backend vulnerabilities** from `npm audit --prefix src/backend`.

The automated tests cover invitation, reminder, and password-reset message composition using real Nodemailer's stream transport, simulated sending failures, frontend URL selection, and SMTP configuration. They send no real emails and do not exercise a live SMTP connection, provider authentication, TLS negotiation, or inbox delivery. Verify those separately with controlled development recipients before treating email delivery as fully verified. The existing application's `tls.rejectUnauthorized: false` setting also remains a separate security concern; a clean dependency audit does not validate application configuration.

To rerun the focused checks:

```bash
npm test --prefix src/backend
```

To review the backend findings, run from the repository root:

```bash
npm audit --prefix src/backend
```

References:

- [Nodemailer address-parser advisory: affected versions through 10.0.5](https://github.com/advisories/GHSA-v53p-9fqp-m79j)
- [Nodemailer 10.0.14 release notes](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.14)

## YAML

The frontend currently resolves `yaml@1.10.2`, which is affected by a stack-overflow vulnerability when parsing deeply nested YAML. The patched releases are **1.10.3** for YAML 1.x and **2.8.3** for YAML 2.x. Previous `npm audit fix` and `npm update yaml` runs did not resolve the installed vulnerable version.

The observed requirements are:

| Package | YAML requirement | Dependency path |
| --- | --- | --- |
| `cosmiconfig@7.1.0` | `^1.10.0` | CRA SVG/PostCSS/Babel tooling; also Emotion's Babel tooling. |
| `cosmiconfig@6.0.0` | `^1.7.2` | `react-scripts` → `react-dev-utils` → `fork-ts-checker-webpack-plugin`. |
| `cssnano@5.1.15` | `^1.10.2` | `react-scripts` → `css-minimizer-webpack-plugin`. |
| `postcss-load-config@6.0.1` | Optional peer dependency `^2.4.2` | `react-scripts` → `tailwindcss`. |

An earlier `npm ls yaml` report showed `postcss-load-config` receiving YAML 1.10.2 despite its YAML 2.x peer requirement, producing an `invalid` dependency error. Both patched YAML major versions can coexist; forcing every consumer to use YAML 2.x would conflict with the packages requiring 1.x.

**Planned remediation:** [Issue #60](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/issues/60) will migrate CRA to Vite and remove obsolete `react-scripts` tooling. This is expected to remove the CRA-specific YAML dependency paths when that tooling is removed. However, `@emotion/react` and `@emotion/styled` also bring in `cosmiconfig@7.1.0` through `@emotion/babel-plugin` → `babel-plugin-macros`. Therefore, migration alone does not guarantee that the YAML vulnerability disappears. Recheck the dependency tree and audit afterward, resolve any remaining vulnerable copies or peer mismatches, and verify the production build.

To inspect the frontend dependency paths and installed versions, run from the repository root:

```bash
npm explain yaml
npm ls yaml
npm audit
```

Reference: [YAML stack-overflow security advisory](https://github.com/advisories/GHSA-48c2-rrv3-qjmp).
