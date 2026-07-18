// Shared pre-check for both OOXML formats this module reads (xlsx, docx):
// detecting a password-protected file before handing it to a zip-based
// parser (ExcelJS, mammoth), which would otherwise fail with a confusing
// "not a zip" error instead of the actionable "password-protected" one.
import { ConversionError } from "../../core/types";

// OLE Compound File Binary signature: how Office wraps an encrypted
// (password-protected) .xlsx/.docx. A plain OOXML file is a zip
// (PK\x03\x04) instead, so seeing this signature reliably means
// "password-protected", not "corrupt".
const OLE_CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function looksPasswordProtected(data: ArrayBuffer): boolean {
  const view = new Uint8Array(data.slice(0, OLE_CFB_SIGNATURE.length));
  return OLE_CFB_SIGNATURE.every((byte, index) => view[index] === byte);
}

export function assertNotPasswordProtected(data: ArrayBuffer, formatLabel: string): void {
  if (looksPasswordProtected(data)) {
    throw new ConversionError(
      "password-protected",
      `File is an OLE compound document (MS-CFB), the container Office uses for password-protected ${formatLabel} files.`,
    );
  }
}
