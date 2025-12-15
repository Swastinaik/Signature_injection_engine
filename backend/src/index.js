import 'dotenv/config'
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Document from './models/Document.js';
import imagekit from './utils/imagekit.js';
import mongoose from 'mongoose';
import cors from 'cors';

import { generateHash } from './utils/hashing.js';
import 'dotenv/config'
const upload = multer({ storage: multer.memoryStorage() })

const app = express()

app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGINS?.split(",");

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("No file uploaded");
        const result = await imagekit.upload({
            file: req.file.buffer, // The file buffer
            fileName: `original_${Date.now()}.pdf`,
            folder: "/boloforms_docs"
        });
        const newDoc = await Document.create({
            originalPdfUrl: result.url,
            fileId: result.fileId
        });
        res.json({
            success: true,
            documentId: newDoc._id,
            url: newDoc.originalPdfUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Upload failed" });

    }
})


app.get('/document/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        console.log(documentId)
        const docRecord = await Document.findById(documentId);
        if (!docRecord) return res.status(404).send("Document not found");
        console.log(docRecord)
        return res.json({
            success: true,
            documentId: docRecord._id,
            url: docRecord.originalPdfUrl,
            signedUrl: docRecord.signedPdfUrl,
            originalHash: docRecord.originalHash,
            finalHash: docRecord.finalHash
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch document" });
    }
})

app.post('/document/sign', async (req, res) => {
    try {
        const { documentId, signatures } = req.body;
        // signatures = [{ type: 'text', page: 1, x: 50, y: 20, width: 10, height: 5, value: "Hello" }, ...]

        // 1. Fetch the Document Record
        const docRecord = await Document.findById(documentId);
        if (!docRecord) return res.status(404).send("Document not found");

        // 2. Download the Original PDF
        const pdfBytes = await axios.get(docRecord.originalPdfUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(pdfBytes.data);

        // --- SECURITY: Hash Original ---
        const originalHash = generateHash(pdfBuffer);

        // 3. Load PDF into Memory
        const pdfDoc = await PDFDocument.load(pdfBytes.data);

        // 4. Embed Fonts (Required for Text, Date, and Radio X)
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // 5. THE LOOP: Process every field
        for (const sig of signatures) {
            // A. Get the Page
            // Frontend sends 1-based index (Page 1), PDF-Lib uses 0-based (Index 0)
            const pages = pdfDoc.getPages();
            const page = pages[sig.page - 1];

            // If page doesn't exist, skip
            if (!page) continue;

            const { width, height } = page.getSize();

            // --- COMMON MATH: Position & Size ---
            // Convert Percentage to PDF Points
            const xPos = (sig.x / 100) * width;
            const boxWidth = (sig.width / 100) * width;
            const boxHeight = (sig.height / 100) * height;

            // Base Y Position (Flipped because PDF starts at bottom-left)
            // This 'yPos' represents the TOP of the user's box
            const yPosTop = height - ((sig.y / 100) * height);


            // --- LOGIC PER TYPE ---

            // === TYPE 1 & 2: SIGNATURE OR IMAGE ===
            if (sig.type === 'signature' || sig.type === 'image') {
                if (sig.value) { // Only if user uploaded/signed
                    try {
                        // 1. Handle Base64 Data
                        const base64Data = sig.value.split(',')[1];
                        const isJpg = sig.value.startsWith('data:image/jpeg') || sig.value.startsWith('data:image/jpg');

                        // 2. Embed the correct format
                        let imageEmbed;
                        if (isJpg) {
                            imageEmbed = await pdfDoc.embedJpg(base64Data);
                        } else {
                            imageEmbed = await pdfDoc.embedPng(base64Data);
                        }

                        // 3. Scale Image (Aspect Ratio Constraint)
                        const dims = imageEmbed.scaleToFit(boxWidth, boxHeight);

                        // 4. Calculate Final Y
                        // Draw from Bottom-Left, so we take the Top of box and go DOWN by image height
                        const finalY = yPosTop - dims.height;

                        // 5. Draw
                        page.drawImage(imageEmbed, {
                            x: xPos,
                            y: finalY,
                            width: dims.width,
                            height: dims.height,
                        });
                    } catch (e) {
                        console.error(`Failed to burn image field ${sig.id}:`, e);
                    }
                }
            }

            // === TYPE 3 & 4: TEXT OR DATE ===
            else if (sig.type === 'text' || sig.type === 'date') {
                if (sig.value) {
                    // 1. Calculate Font Size 
                    // Make text fit inside the box height (approx 60% of box height)
                    const fontSize = Math.max(8, boxHeight * 0.6);

                    // 2. Calculate Final Y (Baseline adjustment)
                    // Move down by full box height, then up a bit for padding
                    const finalY = yPosTop - boxHeight + (boxHeight * 0.25);

                    // 3. Draw
                    page.drawText(sig.value, {
                        x: xPos,
                        y: finalY,
                        size: fontSize,
                        font: fontRegular,
                        color: rgb(0, 0, 0),
                        maxWidth: boxWidth, // Wrap text if too long
                    });
                }
            }

            // === TYPE 5: RADIO BUTTON ===
            else if (sig.type === 'radio') {
                if (sig.value === true) { // Only draw if Checked
                    // We will draw a bold 'X' or '●'
                    const fontSize = boxHeight * 0.8;

                    // Center the X inside the box
                    const xOffset = (boxWidth - (fontSize * 0.6)) / 2;
                    const finalY = yPosTop - boxHeight + (boxHeight * 0.15);

                    page.drawText('X', {
                        x: xPos + xOffset,
                        y: finalY,
                        size: fontSize,
                        font: fontBold,
                        color: rgb(0, 0, 0),
                    });
                }
            }
        }

        // 6. Save Signed PDF
        const signedPdfBytes = await pdfDoc.save();
        const signedBuffer = Buffer.from(signedPdfBytes);

        // --- SECURITY: Hash Final ---
        const finalHash = generateHash(signedBuffer);

        // 7. Upload to ImageKit
        const uploadResult = await imagekit.upload({
            file: signedBuffer,
            fileName: `signed_${documentId}.pdf`,
            folder: "/boloforms_signed"
        });

        // 8. Update Database
        docRecord.signedPdfUrl = uploadResult.url;
        docRecord.status = 'Signed';
        docRecord.originalHash = originalHash;
        docRecord.finalHash = finalHash;

        docRecord.history.push({
            action: 'SIGNED',
            details: `Signed with ${signatures.length} fields`,
            timestamp: new Date()
        });

        await docRecord.save();

        // 9. Return Success
        res.json({
            success: true,
            signedUrl: uploadResult.url,
            verification: { original: originalHash, final: finalHash }
        });

    } catch (error) {
        console.error("Signing Error:", error);
        res.status(500).json({ error: "Failed to sign PDF" });
    }
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 3000
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("✅ MongoDB connected");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("❌ MongoDB connection failed", error);
        process.exit(1); // stop app if DB fails
    }
}

startServer();