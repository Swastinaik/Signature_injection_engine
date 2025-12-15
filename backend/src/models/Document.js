import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
    originalPdfUrl: { type: String, required: true },
    signedPdfUrl: { type: String }, // Initially empty
    fileId: { type: String }, // ImageKit File ID (to delete later if needed)
    originalHash: { type: String }, // Fingerprint of empty PDF
    finalHash: { type: String },    // Fingerprint of signed PDF
    history: [
        {
            action: { type: String }, // e.g., "UPLOAD", "SIGNED"
            timestamp: { type: Date, default: Date.now },
            details: { type: String } // e.g., "Signed on Page 1"
        }
    ],
    status: { type: String, enum: ['Draft', 'Signed'], default: 'Draft' },
    createdAt: { type: Date, default: Date.now }
})

const Document = mongoose.model('Document', DocumentSchema)

export default Document