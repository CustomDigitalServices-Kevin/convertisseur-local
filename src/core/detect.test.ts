import { describe, expect, it } from "vitest";
import { detectFormat, isGooglePointer } from "./detect";

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

  it("detects TIFF in both byte orders", () => {
    expect(detectFormat("scan.tiff", buf([0x49, 0x49, 0x2a, 0x00]))).toBe("tiff");
    expect(detectFormat("scan.tif", buf([0x4d, 0x4d, 0x00, 0x2a]))).toBe("tiff");
  });

  it("detects GIF from its GIF8 signature", () => {
    const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    expect(detectFormat("anim.gif", buf(gif89a))).toBe("gif");
  });

  it("detects BMP only with a plausible DIB header, not bare BM text", () => {
    const bmp = new Array<number>(20).fill(0);
    bmp[0] = 0x42;
    bmp[1] = 0x4d;
    bmp[14] = 40; // BITMAPINFOHEADER
    expect(detectFormat("img.bmp", buf(bmp))).toBe("bmp");
    const fakeText = Array.from(new TextEncoder().encode("BMW sales report 2026"));
    expect(detectFormat("notes.xyz", buf(fakeText))).toBeNull();
  });

  it("maps text extensions md/txt/yaml/xml and epub zip container", () => {
    const text = Array.from(new TextEncoder().encode("# Title"));
    expect(detectFormat("readme.md", buf(text))).toBe("md");
    expect(detectFormat("notes.markdown", buf(text))).toBe("md");
    expect(detectFormat("notes.txt", buf(text))).toBe("txt");
    expect(detectFormat("config.yml", buf(text))).toBe("yaml");
    expect(detectFormat("feed.xml", buf(text))).toBe("xml");
    expect(detectFormat("book.epub", buf([0x50, 0x4b, 0x03, 0x04]))).toBe("epub");
  });

  it("flags Google Drive pointer files", () => {
    expect(isGooglePointer("report.gdoc")).toBe(true);
    expect(isGooglePointer("sheet.gsheet")).toBe(true);
    expect(isGooglePointer("report.docx")).toBe(false);
  });
});
