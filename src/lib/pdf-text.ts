// Turns a PDF into plain text with pdf.js. Shared by the browser app and the fixture script.
interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
  type?: string;
}
interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: TextItemLike[] }> }>;
}

export async function pdfToText(doc: PdfDoc): Promise<string> {
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    text += `${tc.items.map((i) => (i.str ?? '') + (i.hasEOL ? '\n' : ' ')).join('')}\n`;
  }
  return text;
}
