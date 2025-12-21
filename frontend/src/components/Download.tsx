import { useState, useEffect } from "react";
import { useParams } from "react-router"
import axios from "axios";
import { Download as DownloadIcon, CheckCircle2, FileCheck, Hash, Copy, Check, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const Download = () => {
    const { documentId } = useParams();
    const apiurl = import.meta.env.VITE_API_URL;
    
    const [originalHash, setOriginalHash] = useState("");
    const [finalHash, setFinalHash] = useState("");
    const [pdfUrl, setPdfUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [copiedHash, setCopiedHash] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                console.log("starts fetching")
                const response = await axios.get(`${apiurl}/document/${documentId}`);
                console.log("response data ", response.data)
                setOriginalHash(response.data.originalHash);
                setFinalHash(response.data.finalHash);
                setPdfUrl(response.data.signedUrl);
                setLoading(false);
            } catch (error: any) {
                console.error(error);
                setError(error.response?.data?.message || "Failed to load document details");
                setLoading(false);
            }
        }
        fetchDocument();
    }, [documentId, apiurl])

    const handleDownload = async () => {
        try {
            setDownloading(true);
            console.log(pdfUrl)
            const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
            console.log(response.data)
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `signed_document_${documentId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setError("Failed to download document. Please try again.");
        } finally {
            setDownloading(false);
        }
    }

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedHash(type);
            setTimeout(() => setCopiedHash(null), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    }

   

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <Card className="w-full max-w-md shadow-xl border-slate-200/60">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <p className="text-lg font-medium text-slate-700">Loading document details...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error && !pdfUrl) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
                <Card className="w-full max-w-md shadow-xl border-slate-200/60">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="p-4 bg-red-100 rounded-full">
                            <AlertCircle className="w-12 h-12 text-red-600" />
                        </div>
                        <p className="text-lg font-medium text-slate-900">Document Not Found</p>
                        <p className="text-sm text-slate-600 text-center">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            <Card className="w-full max-w-3xl shadow-xl border-slate-200/60">
                {/* Success Header */}
                <CardHeader className="space-y-4 text-center pb-6">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                            <div className="relative p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                            Document Signed Successfully!
                        </CardTitle>
                        <CardDescription className="text-base text-slate-600">
                            Your document has been digitally signed and is ready for download
                        </CardDescription>
                    </div>

                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 px-4 py-1.5">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Signature Verified
                    </Badge>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Document Hashes Section */}
                    <div className="bg-slate-50 rounded-xl p-6 space-y-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Hash className="w-5 h-5 text-slate-600" />
                            <h3 className="font-semibold text-slate-900">Document Verification Hashes</h3>
                        </div>

                        <Separator className="bg-slate-200" />

                        {/* Original Hash */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Original Hash</label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(originalHash, 'original')}
                                    className="h-8 text-xs hover:bg-slate-200"
                                >
                                    {copiedHash === 'original' ? (
                                        <>
                                            <Check className="w-3 h-3 mr-1" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                                <p className="text-sm font-mono text-slate-600 break-all" title={originalHash}>
                                    {originalHash}
                                </p>
                            </div>
                        </div>

                        {/* Final Hash */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Signed Hash</label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(finalHash, 'final')}
                                    className="h-8 text-xs hover:bg-slate-200"
                                >
                                    {copiedHash === 'final' ? (
                                        <>
                                            <Check className="w-3 h-3 mr-1" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                                <p className="text-sm font-mono text-slate-600 break-all" title={finalHash}>
                                    {finalHash}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                These cryptographic hashes verify the integrity and authenticity of your signed document. Store them securely for future verification.
                            </p>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                            <AlertDescription className="text-sm">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Download Button */}
                    <Button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="text-white cursor-pointer w-full h-14 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        {downloading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Download Signed Document
                            </>
                        )}
                    </Button>

                    {/* Document ID */}
                    <div className="text-center pt-2">
                        <p className="text-xs text-slate-500">
                            Document ID: <span className="font-mono text-slate-600">{documentId}</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Download
