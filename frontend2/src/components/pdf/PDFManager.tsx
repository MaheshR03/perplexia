import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { PDFList } from "./PDFList";
import { PDFUploader } from "./PDFUploader";
import { usePDFs } from "@/hooks/usePDFs";
import { useChat } from "@/hooks/useChat";

export function PDFManager() {
  const [showUploader, setShowUploader] = useState(false);
  const { pdfs, loadPDFs, uploadPDF, addPDFToSession } = usePDFs();
  const { currentSessionId } = useChat();

  // Load PDFs on mount
  useEffect(() => {
    loadPDFs();
  }, []);

  const handleUpload = async (file: File) => {
    const pdfId = await uploadPDF(file);
    setShowUploader(false);
    if (pdfId && currentSessionId) {
      await addPDFToSession(pdfId, currentSessionId);
    }
  };

  const handleSelectPDF = async (pdfId: number) => {
    if (currentSessionId) {
      await addPDFToSession(pdfId, currentSessionId);
    } else {
      alert("Please start a new chat first");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Document Manager</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploader(!showUploader)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload PDF
        </Button>
      </div>

      {showUploader && (
        <PDFUploader
          onUpload={handleUpload}
          onCancel={() => setShowUploader(false)}
        />
      )}

      <PDFList pdfs={pdfs} onSelectPDF={handleSelectPDF} />
    </div>
  );
}
