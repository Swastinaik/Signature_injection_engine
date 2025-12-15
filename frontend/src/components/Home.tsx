import { useState, type ChangeEvent, useRef } from "react"
import { useNavigate } from "react-router"
import axios from "axios"

const Home = () => {
    const apiurl = import.meta.env.VITE_API_URL;
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement | null>(null)


    const handlefileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            setFile(files[0])
        }
    }

    const handleSubmit = async () => {
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setLoading(true)
        try {
            const response = await axios.post(`${apiurl}/upload`, formData)
            if (response.status !== 200) {
                throw new Error('Failed to upload file')
            }
            navigate(`/signature/${response.data.documentId}`)

        } catch (error: any) {
            console.error(error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center space-y-5">
            <h1 className="text-bold text-2xl">Select your file for Signature</h1>

            <div
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500 transition"
            >
                <p className="text-sm text-gray-600">
                    Click to upload or drag & drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    PDF
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    id="file"
                    className="hidden"
                    onChange={handlefileChange}
                />
            </div>
            {
                file && (
                    <div className="flex flex-col space-x-2">
                        <p className="text-center font-semibold">Selected file: {file.name}</p>
                    </div>
                )
            }
            <button className="h-8 w-16 p-4 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-900 bg-gray-800 text-white" onClick={handleSubmit}>{loading ? 'Uploading...' : 'Upload'}</button>
            {
                error && (
                    <p className="text-red-500">{error}</p>
                )
            }

        </div>
    )
}

export default Home