// Custom canvas trimming utility to remove empty space
export function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = pixels;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    // Find the bounding box of non-transparent pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // If the canvas is empty, return original
    if (minX > maxX || minY > maxY) return canvas;

    // Add small padding
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    // Create a new canvas with trimmed dimensions
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;

    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return canvas;

    // Draw the trimmed portion
    trimmedCtx.drawImage(
        canvas,
        minX,
        minY,
        trimmedWidth,
        trimmedHeight,
        0,
        0,
        trimmedWidth,
        trimmedHeight
    );

    return trimmedCanvas;
}
