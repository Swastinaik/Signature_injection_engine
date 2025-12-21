import { useState, type ChangeEvent, useRef } from "react"
import { useNavigate } from "react-router"
import axios from "axios"
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const Home = () => {
    const apiurl = import.meta.env.VITE_API_URL;
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement | null>(null)

    const handlefileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            const selectedFile = files[0]
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile)
                setError(null)
            } else {
                setError('Please select a valid PDF file')
            }
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0]
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile)
                setError(null)
            } else {
                setError('Please select a valid PDF file')
            }
        }
    }

    const handleSubmit = async () => {
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setLoading(true)
        setError(null)
        
        try {
            const response = await axios.post(`${apiurl}/upload`, formData)
            if (response.status !== 200) {
                throw new Error('Failed to upload file')
            }
            navigate(`/signature/${response.data.documentId}`)
        } catch (error: any) {
            console.error(error)
            setError(error.response?.data?.message || error.message || 'Upload failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const removeFile = () => {
        setFile(null)
        setError(null)
        if (inputRef.current) {
            inputRef.current.value = ''
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            <Card className="w-full max-w-2xl shadow-xl border-slate-200/60">
                <CardHeader className="space-y-1 text-center pb-4">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        PDF Signature Tool
                    </CardTitle>
                    <CardDescription className="text-base text-slate-600">
                        Upload your PDF document to add digital signatures
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Upload Area */}
                    <div
                        onClick={() => !file && inputRef.current?.click()}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`
                            relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                            ${dragActive 
                                ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' 
                                : file 
                                    ? 'border-green-300 bg-green-50/30' 
                                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
                            }
                            ${file ? 'cursor-default' : ''}
                        `}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={handlefileChange}
                            disabled={loading}
                        />

                        {!file ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6">
                                <div className="p-4 bg-slate-100 rounded-full mb-4">
                                    <Upload className="w-10 h-10 text-slate-600" />
                                </div>
                                <p className="text-lg font-medium text-slate-700 mb-2">
                                    {dragActive ? 'Drop your PDF here' : 'Click to upload or drag & drop'}
                                </p>
                                <p className="text-sm text-slate-500">
                                    PDF files only • Max 10MB
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                                        <FileText className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeFile()
                                            }}
                                            disabled={loading}
                                            className="hover:bg-red-50 hover:text-red-600"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                            <AlertDescription className="text-sm">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Upload Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!file || loading}
                        className="text-white cursor-pointer w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5 mr-2" />
                                Continue to Signature
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

export default Home
