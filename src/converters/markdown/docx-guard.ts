// Pre-check for DOCX -> MD: detect a password-protected file before handing
// it to mammoth (a zip-based parser), which would otherwise fail with a
// confusing "not a zip" error instead of the actionable "password-protected"
// one. Deliberately a local copy of the same check the office module (T5)
// carries in ooxml.ts rather than a cross-team import: it is ~15 lines of
// stable, documented format-signature logic, and keeping it local avoids any
// coupling between the two teams' in-flight worktrees.
import { ConversionError } from "../../core/types";

// OLE Compound File Binary signature: how Office wraps an encrypted
// (password-protected) .docx. A plain OOXML file is a zip (PK\x03\x04)
// instead, so seeing this signature reliably means "password-protected".
const OLE_CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function looksPasswordProtected(data: ArrayBuffer): boolean {
  const view = new Uint8Array(data.slice(0, OLE_CFB_SIGNATURE.length));
  return OLE_CFB_SIGNATURE.every((byte, index) => view[index] === byte);
}

export function assertDocxNotPasswordProtected(data: ArrayBuffer): void {
  if (looksPasswordProtected(data)) {
    throw new ConversionError(
      "password-protected",
      "File is an OLE compound document (MS-CFB), the container Office uses for password-protected DOCX files.",
    );
  }
}
