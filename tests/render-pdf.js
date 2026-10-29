import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Render the actual downloaded PDF, independently of the application's export canvas.
export async function renderPDF(bytes) {
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const page = await document.getPage(1),
    viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  await page.render({ canvasContext: canvas.getContext("2d"), viewport })
    .promise;
  const result = {
    pageCount: document.numPages,
    width: canvas.width,
    height: canvas.height,
    png: canvas.toBuffer("image/png"),
  };
  await loadingTask.destroy();
  return result;
}
