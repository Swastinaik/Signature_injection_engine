import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { Rnd } from 'react-rnd';
import { useParams, useNavigate } from "react-router";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import SignatureModal from './SignatureModal';
import { 
    Type, 
    ImageIcon, 
    Calendar, 
    PenTool, 
    CheckCircle, 
    Trash2, 
    ZoomIn, 
    ZoomOut, 
    ChevronLeft, 
    ChevronRight,
    FileText,
    Loader2,
    Save,
    Undo,
    Redo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FIELD_TYPES = [
    { id: 'text', label: 'Text', icon: Type, color: 'blue' },
    { id: 'signature', label: 'Signature', icon: PenTool, color: 'purple' },
    { id: 'date', label: 'Date', icon: Calendar, color: 'green' },
    { id: 'image', label: 'Image', icon: ImageIcon, color: 'orange' },
    { id: 'radio', label: 'Checkbox', icon: CheckCircle, color: 'indigo' },
];

export default function MultiPagePdfEditor() {
    const { documentId } = useParams();
    const apiurl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    
    const [numPages, setNumPages] = useState<number | null>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [file, setFile] = useState<any>(null);
    const [signingFieldId, setSigningFieldId] = useState<number | null>(null);
    const [selectedPage, setSelectedPage] = useState<number>(1);
    const [_signatureDetail, setSignatureDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await axios.get(`${apiurl}/document/${documentId}`);
                if (response.status !== 200) {
                    throw new Error('Failed to fetch document');
                }
                console.log(response.data);
                const { url } = response.data;
                const pdfBytes = await axios.get(url, { responseType: 'arraybuffer' });
                await new Promise(resolve => setTimeout(resolve, 100));
                setFile(pdfBytes.data);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };
        fetchDocument();
    }, [documentId, apiurl]);

    const addField = (type: string) => {
        const newField = {
            id: Date.now(),
            type: type,
            page: selectedPage,
            text: '',
            x: 40,
            y: 40,
            width: 20,
            height: 5,
            value: '',
            isSigned: false
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    const handleDragStop = (id: number, d: any, pageNumber: number) => {
        const pageRef = pageRefs.current.get(pageNumber);
        if (!pageRef) return;

        const { offsetWidth, offsetHeight } = pageRef;
        const xPercent = (d.x / offsetWidth) * 100;
        const yPercent = (d.y / offsetHeight) * 100;

        updateField(id, { x: xPercent, y: yPercent });
    };

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
                value: base64Signature,
                isSigned: true
            });
            setSigningFieldId(null);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateField(id, { value: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignPdf = async () => {
        console.log("Start signing");
        setSaving(true);
        try {
            const response = await axios.post(`${apiurl}/document/sign`, { 
                signatures: fields, 
                documentId 
            });
            console.log(response.data);
            const { signedUrl, verification } = response.data;
            const { original, final } = verification;
            setSignatureDetail({ signedUrl, original, final });
            navigate(`/download/${documentId}`);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const deleteField = (id: number) => {
        setFields(fields.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <Card className="p-12 shadow-xl">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <p className="text-lg font-medium text-slate-700">Loading document...</p>
                    </div>
                </Card>
            </div>
        );
    }

    console.log(fields);

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            
            {/* Left Sidebar - Tools */}
            <div className="w-20 bg-white border-r border-slate-200 shadow-lg flex flex-col items-center py-6 gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md mb-4">
                    <FileText className="w-6 h-6 text-white" />
                </div>
                
                <Separator className="w-12 bg-slate-200" />
                
                <TooltipProvider>
                    {FIELD_TYPES.map((fieldType) => {
                        const Icon = fieldType.icon;
                        return (
                            <Tooltip key={fieldType.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => addField(fieldType.id)}
                                        className="w-14 h-14 rounded-xl hover:bg-slate-100 transition-all duration-200 hover:scale-105"
                                    >
                                        <Icon className="w-6 h-6 text-slate-700" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>Add {fieldType.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>

                <Separator className="w-12 bg-slate-200 mt-auto" />
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                                className="w-14 h-14 rounded-xl hover:bg-slate-100"
                            >
                                <ZoomOut className="w-5 h-5 text-slate-700" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Zoom Out</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                                className="w-14 h-14 rounded-xl hover:bg-slate-100"
                            >
                                <ZoomIn className="w-5 h-5 text-slate-700" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Zoom In</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Top Toolbar */}
                <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-900">PDF Editor</h1>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                            Page {selectedPage} of {numPages}
                        </Badge>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {fields.length} Fields
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-slate-50"
                            disabled
                        >
                            <Undo className="w-4 h-4 mr-2" />
                            Undo
                        </Button>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-slate-50"
                            disabled
                        >
                            <Redo className="w-4 h-4 mr-2" />
                            Redo
                        </Button>

                        <Separator orientation="vertical" className="h-8" />

                        <Button
                            onClick={handleSignPdf}
                            disabled={saving || fields.length === 0}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Generate PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Document View Area */}
                <div className="flex-1 overflow-auto bg-slate-100 p-8">
                    <div className="max-w-5xl mx-auto">
                        <Document
                            file={file}
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            className="flex flex-col gap-8 items-center"
                        >
                            {Array.from(new Array(numPages), (_, index) => {
                                const pageNumber = index + 1;
                                const pageWidth = 800 * zoom;

                                return (
                                    <div
                                        key={pageNumber}
                                        onMouseEnter={() => setSelectedPage(pageNumber)}
                                        ref={(el) => {
                                            if (el) pageRefs.current.set(pageNumber, el);
                                            else pageRefs.current.delete(pageNumber);
                                        }}
                                        className="relative group"
                                    >
                                        {/* Page Number Badge */}
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                                            <Badge 
                                                variant={selectedPage === pageNumber ? "default" : "secondary"}
                                                className={`shadow-md ${
                                                    selectedPage === pageNumber 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-white text-slate-700'
                                                }`}
                                            >
                                                Page {pageNumber}
                                            </Badge>
                                        </div>

                                        {/* PDF Page with Ring Effect */}
                                        <div 
                                            className={`
                                                relative shadow-2xl transition-all duration-300 rounded-lg overflow-hidden
                                                ${selectedPage === pageNumber 
                                                    ? 'ring-4 ring-blue-500 ring-offset-4 ring-offset-slate-100 scale-[1.01]' 
                                                    : 'opacity-80 hover:opacity-100'
                                                }
                                            `}
                                        >
                                            <Page
                                                pageNumber={pageNumber}
                                                width={pageWidth}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                className="bg-white"
                                            />

                                            {/* Draggable Fields */}
                                            {fields
                                                .filter((field) => field.page === pageNumber)
                                                .map((field) => {
                                                    const pageRef = pageRefs.current.get(pageNumber);
                                                    const containerWidth = pageRef?.offsetWidth || pageWidth;
                                                    const containerHeight = pageRef?.offsetHeight || 1100 * zoom;

                                                    const widthPx = (field.width / 100) * containerWidth;
                                                    const heightPx = (field.height / 100) * containerHeight;
                                                    const xPx = (field.x / 100) * containerWidth;
                                                    const yPx = (field.y / 100) * containerHeight;

                                                    const isSelected = selectedFieldId === field.id;

                                                    return (
                                                        <Rnd
                                                            key={field.id}
                                                            bounds="parent"
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
                                                            onClick={() => setSelectedFieldId(field.id)}
                                                            className={`
                                                                border-none rounded-md 
                                                                 ${isSelected ? 'hover:ring-2 ring-offset-2 ring-blue-400 shadow-lg' : ''}
                                                                hover:border-2
                                                                group/field
                                                            `}
                                                        >
                                                            {/* Delete Button */}
                                                            <Button
                                                                size="icon"
                                                                variant="destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteField(field.id);
                                                                }}
                                                                className="absolute -top-3 -right-3 w-7 h-7 opacity-0 group-hover/field:opacity-100 transition-opacity shadow-lg z-50 bg-destructive"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>

                                                            {/* Field Content */}
                                                            {field.type === 'signature' && (
                                                                <div
                                                                    onDoubleClick={() => setSigningFieldId(field.id)}
                                                                    className="w-full h-full flex items-center justify-center cursor-pointer"
                                                                >
                                                                    {field.value ? (
                                                                        <img
                                                                            src={field.value}
                                                                            alt="Signature"
                                                                            className="w-full h-full object-contain pointer-events-none"
                                                                        />
                                                                    ) : (
                                                                        <div className="text-center flex flex-col items-center gap-1">
                                                                            <PenTool className="w-5 h-5 text-purple-600" />
                                                                            <span className="text-purple-700 text-xs font-semibold">
                                                                                Double-click to sign
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {field.type === 'date' && (
                                                                <input
                                                                    type="date"
                                                                    className="w-full h-full bg-white/80 backdrop-blur-sm border-0 rounded p-2 text-sm font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400"
                                                                    value={field.value || ''}
                                                                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                                                                />
                                                            )}

                                                            {field.type === 'text' && (
                                                                <textarea
                                                                    value={field.text}
                                                                    onChange={(e) => updateField(field.id, { text: e.target.value })}
                                                                    placeholder="Type here..."
                                                                    className="w-full h-full bg-white/80 backdrop-blur-sm resize-none outline-none p-2 text-sm text-slate-700 rounded focus:ring-2 focus:ring-blue-400"
                                                                />
                                                            )}

                                                            {field.type === 'image' && (
                                                                <div className="w-full h-full bg-white/90 backdrop-blur-sm border-2 border-dashed border-orange-300 rounded flex items-center justify-center overflow-hidden relative group/image">
                                                                    {field.value ? (
                                                                        <>
                                                                            <img 
                                                                                src={field.value} 
                                                                                className="w-full h-full object-contain" 
                                                                                alt="Uploaded" 
                                                                            />
                                                                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/image:opacity-100 cursor-pointer text-white text-sm font-medium transition-opacity">
                                                                                Change Image
                                                                                <input 
                                                                                    type="file" 
                                                                                    accept="image/*" 
                                                                                    className="hidden" 
                                                                                    onChange={(e) => handleImageUpload(e, field.id)} 
                                                                                />
                                                                            </label>
                                                                        </>
                                                                    ) : (
                                                                        <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full text-orange-600 hover:bg-orange-50 transition-colors">
                                                                            <ImageIcon className="w-6 h-6 mb-1" />
                                                                            <span className="text-xs font-semibold">Upload</span>
                                                                            <input 
                                                                                type="file" 
                                                                                accept="image/*" 
                                                                                className="hidden" 
                                                                                onChange={(e) => handleImageUpload(e, field.id)} 
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {field.type === 'radio' && (
                                                                <div
                                                                    className="w-full h-full flex items-center justify-center cursor-pointer bg-white/80 backdrop-blur-sm rounded"
                                                                    onClick={() => updateField(field.id, { value: !field.value })}
                                                                >
                                                                    <div className="rounded-full border-3 border-indigo-600 flex items-center justify-center w-[70%] h-[70%]">
                                                                        {field.value && (
                                                                            <div className="w-[60%] h-[60%] bg-indigo-600 rounded-full" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Rnd>
                                                    );
                                                })}
                                        </div>

                                        {/* Page Navigation Overlay */}
                                        {selectedPage === pageNumber && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setSelectedPage(Math.max(1, pageNumber - 1))}
                                                    disabled={pageNumber === 1}
                                                    className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setSelectedPage(Math.min(numPages || 1, pageNumber + 1))}
                                                    disabled={pageNumber === numPages}
                                                    className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </Document>
                    </div>
                </div>
            </div>

            {/* Signature Modal */}
            <SignatureModal
                isOpen={signingFieldId !== null}
                onClose={() => setSigningFieldId(null)}
                onSave={handleSignatureSave}
            />
        </div>
    );
}
