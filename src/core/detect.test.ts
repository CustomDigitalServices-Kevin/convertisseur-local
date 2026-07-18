import { describe, expect, it } from "vitest";
import { detectFormat } from "./detect";

function buf(bytes: number[], padTo = 64): ArrayBuffer {
  const view = new Uint8Array(Math.max(bytes.length, padTo));
  view.set(bytes);
  return view.buffer;
}

describe("detectFormat", () => {
  it("detects PDF from %PDF magic bytes even with a wrong extension", () => {
    expect(detectFormat("document.txt", buf([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("pdf");
  });

  it("detects PNG", () => {
    expect(
      detectFormat("img.png", buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("png");
  });

  it("detects JPEG", () => {
    expect(detectFormat("photo.jpg", buf([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });

  it("detects WebP via RIFF container", () => {
    const riffWebp = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
    expect(detectFormat("img.webp", buf(riffWebp))).toBe("webp");
  });

  it("detects AVIF via ftypavif", () => {
    const avif = [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66];
    expect(detectFormat("img.avif", buf(avif))).toBe("avif");
  });

  it("disambiguates zip containers by extension", () => {
    const zip = [0x50, 0x4b, 0x03, 0x04];
    expect(detectFormat("report.docx", buf(zip))).toBe("docx");
    expect(detectFormat("data.xlsx", buf(zip))).toBe("xlsx");
    expect(detectFormat("archive.zip", buf(zip))).toBe("zip");
  });

  it("falls back to extension for text formats", () => {
    const text = Array.from(new TextEncoder().encode("a,b,c\n1,2,3"));
    expect(detectFormat("data.csv", buf(text))).toBe("csv");
    expect(detectFormat("icon.svg", buf(Array.from(new TextEncoder().encode("<svg/>"))))).toBe(
      "svg",
    );
  });

  it("returns null for unknown content", () => {
    expect(detectFormat("mystery.bin", buf([0x00, 0x01, 0x02]))).toBeNull();
  });
});
