// Lazy-loads pdf.js (and its worker) only when someone actually drops a PDF.
import { pdfToText } from './pdf-text';

let lib: Promise<typeof import('pdfjs-dist')> | null = null;

function load() {
  lib ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return lib;
}

export async function fileToText(file: File): Promise<string> {
  const pdfjs = await load();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    return await pdfToText(await task.promise);
  } finally {
    void task.destroy();
  }
}
