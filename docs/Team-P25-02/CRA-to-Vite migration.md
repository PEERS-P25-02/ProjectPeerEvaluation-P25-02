# CRA-to-Vite Migration

## Overview

Create React App (CRA) was deprecated by the React team in February 2025. It has no active maintainers and relies on aging build tooling. Existing applications can continue using it, but migration is recommended for ongoing development.

This project is migrating to Vite to replace CRA's build tooling, improve development startup and hot reloading, and simplify build configuration. The migration preserves the React application, local ports, and production build directory.

Migration reference: [Migrating from Create React App to Vite: A Modern Approach](https://adhithiravi.medium.com/migrating-from-create-react-app-to-vite-a-modern-approach-76148adb8983).

Official announcement: [Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app).

Branch: `60-migrate-frontend-build-tooling-from-create-react-app-to-vite`

This record describes the CRA-to-Vite migration baseline. Subsequent work
added Vitest and replaced inline ESLint configuration with ESLint 9 flat
configuration, recommended presets, and Prettier commands. Current lint
reports zero errors and zero warnings; the earlier eight-warning result below
is historical. See [ESLint Upgrade and Flat Configuration](eslint-migration.md)
and [Unit Testing Implementation](testing/01-unit-testing-implementation.md)
for the implemented follow-up tooling and its remaining limitations.

## Configuration Changes

| Configuration | Issue with previous configuration | New configuration | Reason for change |
|---|---|---|---|
| HTML entry point | CRA injected scripts into `public/index.html`; Vite expects root-level HTML. | Root `index.html` explicitly loads `/src/index.jsx`. | Establishes Vite's application entry point. |
| JSX filenames | Components used `.js` filenames containing JSX. | Renamed JSX-containing files to `.jsx`. | Allows Vite to recognize and transform JSX. |
| Build configuration | CRA hid build configuration behind `react-scripts`. | `vite.config.mjs` enables the React plugin. | Configures React processing explicitly while preserving backend CommonJS. |
| npm scripts | Development and build commands invoked removed CRA tooling. | `start` and `start:frontend` run `vite`; `build` runs `vite build`; added `preview`. | Routes existing workflows through Vite. |
| Production output | Vite defaults to `dist/`; CRA used `build/`. | `build.outDir: 'build'`. | Preserves the existing artifact directory. |
| Development server | Vite defaults differ from the existing frontend setup. | Host `0.0.0.0`, port `3000`, and `strictPort: true`. | Preserves network access and the expected port; prevents silently changing ports. |
| API proxy | The package-level CRA `proxy` setting is not Vite configuration. | Vite forwards `/api` to `http://localhost:5000`. | Preserves forwarding for relative API requests. |
| Frontend environment values | Code relied on CRA's `process.env.NODE_ENV` substitution. | Uses `import.meta.env.PROD` and `import.meta.env.MODE`. | Uses Vite's environment API while preserving URL selection. |
| ESLint configuration | Configuration referenced removed CRA presets. | Explicit configuration uses Espree, existing plugins, and 113 preserved rules. | Keeps ESLint working without CRA or Babel parsing. |
| Runtime requirements | Supported Node/npm versions were not declared consistently. | Frontend and backend declare Node `^20.19.0 || >=22.12.0` and npm `>=9.0.0`. | Documents compatible runtimes for the updated tooling. |
| Browser targets | Vite's defaults target Chrome 111 and iOS Safari 16.4, newer than versions selected by the resolved Browserslist queries. | `build.target: ['chrome109', 'edge111', 'firefox114', 'safari16.4', 'ios15.6']`. | Includes Chrome 109 and iOS Safari 15.6 in JavaScript syntax transformations. This does not establish equivalent CRA coverage for CSS, browser APIs, or additional browser families; browser verification remains pending. |

## Verification and Remaining Checks

Production builds passed, the Vite development server served HTML and React modules on port 3000, and explicit ESLint configuration checked all 62 source/configuration files with zero errors and eight existing warnings. The production bundle-size warning remains. Generated `build/` output is ignored and no longer tracked.

`.gitignore` includes `build/`, and previously committed build artifacts have been untracked. Production deployment must run `npm run build` to generate the files it serves.

CRA's test runner was removed with `react-scripts`. Testing Library remains installed; Vitest setup and further browser/backend workflow testing are deferred to the testing branch. Deployment runtime/settings still require verification. Docker configuration is unchanged and deferred to separate work. Production browser targets are explicitly configured; real-browser compatibility checks remain pending. Dependency changes and accepted tooling risks are recorded in [dependency-updates.md](dependency-updates.md).

**Milestone 2 follow-up (#28):** The deferred Vitest setup is implemented for both packages, with jsdom for frontend tests and two initial unit tests. See [Unit Testing Implementation](testing/01-unit-testing-implementation.md) for cases, results, and remaining verification. The runtime range in the migration table records the original migration; the packages now require Node `^22.22.2 || ^24.15.0 || >=26.0.0` to support the test tooling. Broader browser/backend workflow testing, Docker implementation, and deployment verification remain outstanding.

## Possible Future Update: Use Vite's Default Output Directory

Vite currently outputs to `build/` to preserve the existing repository
setup. Since the new Render hosting service is not configured yet,
we may later remove the `build.outDir` override and use Vite's default
`dist/` directory.

That change would also require updating active documentation and
generated-artifact tracking. Future Render settings would use
`npm run build` and publish `dist/`. Local development on port 3000
would remain unchanged.

Deferred for now; the current output directory remains `build/`.
