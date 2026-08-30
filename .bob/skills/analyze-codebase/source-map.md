# Source Map — `analyze-codebase` Skill

## How This File Is Used

During an incremental run, the skill executes `git status --short` to obtain the list of files that
have changed since the last analysis. Each changed path is matched against the glob patterns in the
table below. If a path matches one or more patterns, the corresponding output file is marked as
**stale** and will be regenerated; output files with no matching changed paths are **skipped**.
This avoids re-analysing the entire codebase when only a subset of source files changed.

Pattern matching is glob-style: `**` matches any number of path segments, `*` matches within a
single segment, and bare filenames (e.g. `README*`) match anywhere in the tree. Patterns are
evaluated against the full relative path reported by `git status`.

---

## Mapping Table

| Output File | Source Patterns | Rationale |
|---|---|---|
| `PROJECT.md` | `README*`, `package.json`, `pyproject.toml`, `Cargo.toml`, `*.csproj`, `pom.xml`, `build.gradle*` | These files describe the project's identity, purpose, and entry points. Any change to a root manifest or README directly affects the project overview. |
| `ARCHITECTURE.md` | New/deleted directories (any structural change), `src/**`, `lib/**`, `app/**`, `*.config.*`, `*.yaml`, `*.yml` | Folder layout, module boundaries, and configuration files together define the architectural shape of the project. Adding or removing a top-level directory, or changing a config file, may alter documented design decisions. |
| `TESTING.md` | `**/*.test.*`, `**/*.spec.*`, `tests/**`, `**/__tests__/**`, `jest.config.*`, `pytest.ini`, `vitest.config.*`, `cypress/**`, `playwright.config.*` | Test files and test-runner configuration directly describe the testing strategy, frameworks in use, and how tests are structured. |
| `DEPENDENCIES.md` | `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements*.txt`, `Pipfile*`, `Cargo.toml`, `Cargo.lock`, `*.csproj`, `pom.xml`, `build.gradle*` | All standard dependency manifests and lock files across the major ecosystems (Node, Python, Rust, .NET, JVM). Any change here means the dependency catalogue may be out of date. |
| `CONVENTIONS.md` | `.eslintrc*`, `.prettierrc*`, `.editorconfig`, `biome.json`, `pylintrc`, `.flake8`, `ruff.toml`, `CONTRIBUTING*`, `.github/**` | Linter, formatter, and editor config files encode style conventions. Contribution guides and GitHub workflow files document commit and PR conventions. |
| `GLOSSARY.md` | `src/**`, `tests/**`, `docs/**` | Domain terminology is introduced and refined throughout the source and documentation tree. A broad pattern ensures the glossary is refreshed whenever any domain code changes. |
