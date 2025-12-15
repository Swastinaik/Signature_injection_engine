import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { Rnd } from 'react-rnd';
import { useParams } from "react-router";
import { useNavigate } from "react-router";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import SignatureModal from './SignatureModal';


// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function MultiPagePdfEditor() {
    const { documentId } = useParams();
    const apiurl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate()
    const [numPages, setNumPages] = useState<number | null>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [file, setFile] = useState<any>(null);
    const [signingFieldId, setSigningFieldId] = useState<number | null>(null);
    const [selectedPage, setSelectedPage] = useState<number>(1); // Tracks which page we are looking at
    const [_signatureDetail, setSignatureDetail] = useState<any>(null);

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await axios.get(`${apiurl}/document/${documentId}`);
                if (response.status !== 200) {
                    throw new Error('Failed to fetch document');
                }
                console.log(response.data)
                const { url } = response.data;
                const pdfBytes = await axios.get(url, { responseType: 'arraybuffer' });
                setFile(pdfBytes.data);
            } catch (error) {
                console.error(error);
            }
        }
        fetchDocument();
    }, [documentId])


    // We need refs for EACH page to calculate coordinates relative to THAT page
    // We store them in a Map: pageNumber -> HTMLDivElement
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // 1. Add Field to the CURRENTLY SELECTED Page
    const addField = (type: string) => {
        const newField = {
            id: Date.now(),
            type: type,
            page: selectedPage, // <--- CRITICAL: Associate field with specific page
            text: '',
            x: 40, // Center-ish
            y: 40,
            width: 20,
            height: 5,
            value: '',
            isSigned: false
        };
        setFields([...fields, newField]);
    };

    // 2. Handle Drag Stop (Updated for Multi-page)
    const handleDragStop = (id: number, d: any, pageNumber: number) => {
        const pageRef = pageRefs.current.get(pageNumber);
        if (!pageRef) return;

        const { offsetWidth, offsetHeight } = pageRef;

        // Math: Relative to THIS page's dimensions
        const xPercent = (d.x / offsetWidth) * 100;
        const yPercent = (d.y / offsetHeight) * 100;

        updateField(id, { x: xPercent, y: yPercent });
    };

    // 3. Handle Resize Stop
    const handleResizeStop = (id: number, ref: any, position: any, pageNumber: number) => {
        const pageRef = pageRefs.current.get(pageNumber);
        if (!pageRef) return;

        const { offsetWidth, offsetHeight } = pageRef;

        const widthPercent = (ref.offsetWidth / offsetWidth) * 100;
        const heightPercent = (ref.offsetHeight / offsetHeight) * 100;

        const xPercent = (position.x / offsetWidth) * 100;
        const yPercent = (position.y / offsetHeight) * 100;

        updateField(id, { width: widthPercent, height: heightPercent, x: xPercent, y: yPercent });
    };

    const updateField = (id: number, updates: any) => {
        setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    const handleSignatureSave = (base64Signature: string) => {
        if (signingFieldId) {
            updateField(signingFieldId, {
                value: base64Signature, // Save the image string
                isSigned: true
            });
            setSigningFieldId(null); // Close modal
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Save Base64 string to state
                updateField(id, { value: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignPdf = async () => {
        console.log("Start signing")
        try {
            const response = await axios.post(`${apiurl}/document/sign`, { signatures: fields, documentId });
            console.log(response.data)
            const { signedUrl, verification } = response.data
            const { original, final } = verification
            setSignatureDetail({ signedUrl, original, final })
            navigate(`/download/${documentId}`)

        } catch (error) {
            console.error(error);
        }
    }


    console.log(fields)

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100 p-8">

            {/* --- Sticky Toolbar --- */}

            <div className="fixed top-6 z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 flex gap-4 items-center">
                <span className="text-sm font-bold text-gray-500 uppercase">
                    Editing Page: <span className="text-blue-600 text-lg">{selectedPage}</span>
                </span>
                <div className="h-6 w-px bg-gray-300"></div>
                <button
                    onClick={() => addField('text')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium shadow-sm transition-all"
                >
                    + Add Text
                </button>
                <button
                    onClick={() => addField('signature')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium shadow-sm transition-all"
                >
                    + Add Signature
                </button>
                <button
                    onClick={() => addField('radio')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium shadow-sm transition-all"
                >
                    + Add Radio
                </button>
                <button
                    onClick={() => addField('date')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium shadow-sm transition-all"
                >
                    + Add Date
                </button>
                <button
                    onClick={() => addField('image')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium shadow-sm transition-all"
                >
                    + Add Image
                </button>
                <button
                    onClick={() => handleSignPdf()}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium ml-2 shadow-sm transition-all"
                >
                    Generate
                </button>

            </div>
            <div className="mt-24  max-w-4xl">
                <Document
                    file={file}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    className="flex flex-col gap-8 items-center"
                >
                    {/* Loop through all pages */}
                    {Array.from(new Array(numPages), (_, index) => {
                        const pageNumber = index + 1;

                        return (
                            <div
                                key={pageNumber}
                                // UX TRICK: When mouse enters this page, set it as "Selected"
                                onMouseEnter={() => setSelectedPage(pageNumber)}
                                // Save reference for Math calculations
                                ref={(el) => {
                                    if (el) pageRefs.current.set(pageNumber, el);
                                    else pageRefs.current.delete(pageNumber);
                                }}
                                className={`relative shadow-lg transition-all duration-300 ${selectedPage === pageNumber ? 'ring-4 ring-blue-400/50' : 'opacity-90'
                                    }`}
                            >
                                {/* 1. The PDF Page */}
                                <Page
                                    pageNumber={pageNumber}
                                    width={800} // Fixed width for simplicity in demo
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />

                                {/* 2. The Stickers (Filtered for THIS page only) */}
                                {fields
                                    .filter((field) => field.page === pageNumber)
                                    .map((field) => {
                                        const pageRef = pageRefs.current.get(pageNumber);
                                        const containerWidth = pageRef?.offsetWidth || 800;
                                        const containerHeight = pageRef?.offsetHeight || 1100;

                                        const widthPx = (field.width / 100) * containerWidth;
                                        const heightPx = (field.height / 100) * containerHeight;
                                        const xPx = (field.x / 100) * containerWidth;
                                        const yPx = (field.y / 100) * containerHeight;


                                        return (<Rnd
                                            key={field.id}
                                            bounds="parent" // Confined to THIS page wrapper

                                            // Calculate Pixels for Rendering
                                            size={{
                                                width: `${widthPx}px`,
                                                height: `${heightPx}px`
                                            }}
                                            position={{
                                                x: xPx,
                                                y: yPx
                                            }}

                                            onDragStop={(_e, d) => handleDragStop(field.id, d, pageNumber)}
                                            onResizeStop={(_e, _dir, ref, _delta, pos) =>
                                                handleResizeStop(field.id, ref, pos, pageNumber)
                                            }

                                            className={`border border-transparent  ${field.type === 'signature' ? 'hover:border-gray-500  hover:bg-purple-50/50' : 'hover:border-blue-500 hover:bg-purple-50/50'
                                                } flex items-center justify-center group`}
                                        >
                                            {/* Delete Button */}
                                            <button
                                                onClick={() => setFields(fields.filter(f => f.id !== field.id))}
                                                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-50"
                                            >
                                                X
                                            </button>

                                            {field.type === 'signature' && (
                                                <div
                                                    // Double click to open signing modal
                                                    onDoubleClick={() => setSigningFieldId(field.id)}
                                                    className="w-full h-full flex items-center justify-center cursor-pointer"
                                                >
                                                    {field.value ? (
                                                        // If signed, show the image
                                                        <img
                                                            src={field.value}
                                                            alt="Signature"
                                                            className="w-full h-full object-contain pointer-events-none"
                                                        />
                                                    ) : (
                                                        // If not signed, show prompt
                                                        <div className="text-center">
                                                            <span className="text-purple-800 text-xs font-bold uppercase">Click to Sign</span>
                                                            {/* Optional: Add a small icon here */}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {field.type === 'date' && (
                                                <input
                                                    type="date"
                                                    className="w-full h-full bg-transparent border border-gray-300 rounded p-1 text-xs font-mono cursor-pointer"
                                                    value={field.value || ''}
                                                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                                                />
                                            )}
                                            {field.type === 'text' && (
                                                // Text Area logic...
                                                <textarea
                                                    value={field.text}
                                                    onChange={(e) => updateField(field.id, { text: e.target.value })}
                                                    placeholder="Type..."
                                                    className="w-full h-full bg-transparent resize-none outline-none p-1 text-sm"
                                                />
                                            )}
                                            {field.type === 'image' && (
                                                <div className="w-full h-full bg-gray-100 border border-dashed border-gray-400 flex items-center justify-center overflow-hidden relative group">
                                                    {field.value ? (
                                                        <>
                                                            <img src={field.value} className="w-full h-full object-contain" alt="Uploaded" />
                                                            {/* Allow changing image */}
                                                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer text-white text-xs transition-opacity">
                                                                Change
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, field.id)} />
                                                            </label>
                                                        </>
                                                    ) : (
                                                        <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full text-gray-500 hover:bg-gray-200 transition-colors">
                                                            <span className="text-xs font-bold">Upload Image</span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, field.id)} />
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                            {field.type === 'radio' && (
                                                <div
                                                    className="w-full h-full flex items-center justify-center cursor-pointer"
                                                    onClick={() => updateField(field.id, { value: !field.value })} // Toggle true/false
                                                >
                                                    <div className={`rounded-full border-2 border-black flex items-center justify-center ${
                                                        // Responsive circle size based on box height
                                                        'w-[80%] h-[80%]'
                                                        }`}>
                                                        {/* The "Dot" inside */}
                                                        {field.value && <div className="w-[60%] h-[60%] bg-black rounded-full" />}
                                                    </div>
                                                </div>
                                            )}
                                        </Rnd>)
                                    })}
                            </div>
                        );
                    })}
                </Document>
            </div>
            <SignatureModal
                isOpen={signingFieldId !== null}
                onClose={() => setSigningFieldId(null)}
                onSave={handleSignatureSave}
            />

        </div>
    );
}