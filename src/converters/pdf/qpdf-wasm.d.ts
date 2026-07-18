// @jspawn/qpdf-wasm ships no type declarations. This shim covers exactly the
// surface this module uses, verified against the installed 0.0.2 package
// (node_modules/@jspawn/qpdf-wasm/qpdf.js, Emscripten MODULARIZE output) by
// direct calls: FS.writeFile/readFile are the standard Emscripten virtual
// filesystem, callMain runs the qpdf CLI and returns its exit code, and
// locateFile resolves the companion .wasm binary URL.
declare module "@jspawn/qpdf-wasm/qpdf.mjs" {
  interface QpdfFileSystem {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
  }

  interface QpdfModule {
    FS: QpdfFileSystem;
    /** Runs the qpdf CLI with the given argv (excluding argv[0]); returns its exit code. */
    callMain(args: string[]): number;
  }

  interface QpdfInitOptions {
    locateFile?: (path: string) => string;
  }

  export default function initQpdf(options?: QpdfInitOptions): Promise<QpdfModule>;
}
