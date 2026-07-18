import { describe, expect, it } from "vitest";
import { ConversionError } from "../../core/types";
import { stripExtension, toPdfjsConversionError } from "./pdf-errors";

describe("toPdfjsConversionError", () => {
  it("passes an existing ConversionError through unchanged", () => {
    const original = new ConversionError("password-protected", "already mapped");
    expect(toPdfjsConversionError(original)).toBe(original);
  });

  it("maps a PasswordException (pdfjs-dist src/shared/util.js) to password-protected", () => {
    const error = Object.assign(new Error("No password given"), { name: "PasswordException" });
    const mapped = toPdfjsConversionError(error);
    expect(mapped.code).toBe("password-protected");
    expect(mapped.message).toBe("No password given");
  });

  it("maps an InvalidPDFException to corrupted-file", () => {
    const error = Object.assign(new Error("Invalid PDF structure."), { name: "InvalidPDFException" });
    expect(toPdfjsConversionError(error).code).toBe("corrupted-file");
  });

  it("maps any other error to internal-error", () => {
    expect(toPdfjsConversionError(new Error("boom")).code).toBe("internal-error");
    expect(toPdfjsConversionError("not even an Error").code).toBe("internal-error");
  });
});

describe("stripExtension", () => {
  it("removes the last extension", () => {
    expect(stripExtension("report.pdf")).toBe("report");
    expect(stripExtension("archive.tar.gz")).toBe("archive.tar");
  });

  it("returns the name unchanged when there is no extension", () => {
    expect(stripExtension("README")).toBe("README");
  });
});
