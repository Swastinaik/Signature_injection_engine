import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { trimCanvas } from '../utils/trimCanvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64: string) => void;
}

export default function SignatureModal({ isOpen, onClose, onSave }: Props) {
  const sigCanvas = useRef<any>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (sigCanvas.current) {
      console.log("Saving signature");
      // Get the canvas element and trim it
      const canvas = sigCanvas.current.getCanvas();
      const trimmedCanvas = trimCanvas(canvas);
      const dataURL = trimmedCanvas.toDataURL('image/png');
      console.log(dataURL);
      onSave(dataURL);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] animate-in fade-in zoom-in duration-200">

        <h2 className="text-xl font-bold mb-4 text-gray-800">Draw Your Signature</h2>

        {/* The Drawing Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg mb-6 bg-gray-50">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: 450,
              height: 200,
              className: 'cursor-crosshair'
            }}
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => sigCanvas.current?.clear()}
            className="text-red-500 font-medium hover:underline text-sm"
          >
            Clear
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all"
            >
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}