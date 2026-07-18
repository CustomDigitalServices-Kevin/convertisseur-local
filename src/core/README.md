# Conversion core (T2) — contract for converter teams

Read this before writing any converter module (T3 pdf, T4 image, T5 office) or UI code (T6).

## Files

| File | Role |
|---|---|
| `types.ts` | Domain types: `ConversionRequest`, `ConversionSuccess/Failure`, worker protocol, `ConversionError`. Dependency-free. |
| `detect.ts` | `detectFormat(fileName, data)` — magic bytes first, extension only to disambiguate zip containers (docx/xlsx) and pure text formats. |
| `registry.ts` | Declarative list of supported conversions. `targetsFor(source)` drives the UI target picker. |
| `converter-module.ts` | `ConverterModule` interface every module implements. |
| `worker-bridge.ts` | Main-thread API: `bridge.convert(request, onProgress)` returns a Promise; `bridge.cancelAll()` terminates the worker. |
| `../workers/convert.worker.ts` | The worker: sequential queue, loads modules lazily, posts progress/success/failure. |
| `../workers/module-loaders.ts` | **The only file converter teams edit outside their own directory.** Add your loader entry here. |

## Rules for converter teams (T3-T5)

1. Your module lives in `src/converters/<family>/` and exports a `ConverterModule` named `<family>Module` from `module.ts`.
2. Register it in `src/workers/module-loaders.ts` with a dynamic `import()` (one line). Nothing else outside your directory.
3. Never import your module from main-thread code: it must only be reachable through the worker's dynamic import, so WASM stays out of the initial bundle.
4. Throw `ConversionError` with a stable code for every expected failure (`corrupted-file`, `password-protected`, ...). Unknown errors become `internal-error` automatically.
5. Call `reportProgress(percent)` at least at meaningful milestones (per page, per file).
6. Return `fidelity`: `"high"` unless the output is a lossy approximation (`"medium"` for XLSX→PDF, `"preview"` for DOCX→PDF).
7. Output `ArrayBuffer`s are transferred, not copied — never reuse a buffer after returning it.
8. Licenses: only MIT / Apache-2.0 / BSD / MPL-2.0 dependencies (`npm run check:licenses` gates CI). AGPL and LGPL are forbidden (D2).

## Rule for the UI team (T6)

Consume `detectFormat`, `targetsFor` and `WorkerBridge` only. While converter modules are not merged yet, any conversion resolves to a `failure` with code `unsupported-conversion` — build the error path first, then the dev stub (in `src/dev/`, excluded from production builds) can simulate success states.
