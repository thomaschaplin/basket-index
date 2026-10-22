// Expands any .zip among dropped files into the PDFs and saved orders (.json) inside it. Other files pass through untouched.
import { unzip } from 'fflate';

const isZip = (f: File) => /zip/i.test(f.type) || /\.zip$/i.test(f.name);

function unzipAsync(data: Uint8Array) {
  return new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(data, { filter: (e) => /\.(pdf|json)$/i.test(e.name) && !/(^|\/)(__MACOSX|\.)/.test(e.name) }, (err, out) => (err ? reject(err) : resolve(out))),
  );
}

export async function expandZips(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (!isZip(f)) {
      out.push(f);
      continue;
    }
    try {
      const entries = await unzipAsync(new Uint8Array(await f.arrayBuffer()));
      for (const [path, bytes] of Object.entries(entries)) {
        out.push(new File([bytes], path.split('/').pop()!, { type: /\.json$/i.test(path) ? 'application/json' : 'application/pdf' }));
      }
    } catch {
      out.push(f); // unreadable zip: let the caller report it as a failed file
    }
  }
  return out;
}
