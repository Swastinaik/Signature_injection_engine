import { useState, useEffect } from "react";
import { useParams } from "react-router"
import axios from "axios";
const Download = () => {
    const { documentId } = useParams();
    const apiurl = import.meta.env.VITE_API_URL;
    console.log(documentId)
    const [originalHash, setOriginalHash] = useState("");
    const [finalHash, setFinalHash] = useState("");
    const [pdfUrl, setPdfUrl] = useState("");
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchDocument = async () => {
            try {
                console.log("starts fetchign")
                const response = await axios.get(`${apiurl}/document/${documentId}`);
                console.log("repose data ", response.data)
                setOriginalHash(response.data.originalHash);
                setFinalHash(response.data.finalHash);
                setPdfUrl(response.data.signedUrl);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        }
        fetchDocument();
    }, [])

    const handleDownload = async () => {
        try {
            console.log(pdfUrl)
            const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
            console.log(response.data)
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `signed_document_${documentId}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error(error);
        }
    }

    if (loading) return <div>Loading...</div>
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex items-center justify-center flex-col space-y-2 border-2 border-gray-400 p-4 rounded-2xl">
                <h1 className="text-2xl font-bold mb-4">Thank you for signing the document</h1>
                <h3 className="font-semibold">The Original hash : {originalHash}</h3>
                <h3 className="font-semibold">The Final hash : {finalHash}</h3>
                <button
                    onClick={() => handleDownload()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md">Download</button>
            </div>

        </div>
    )
}
export default Download