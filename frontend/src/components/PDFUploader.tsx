// src/components/PDFUploader.tsx
import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { FileUp, Loader2, File, X } from "lucide-react";
import { toast } from "sonner";
import { pdfApi } from "../lib/api";
import { PdfDocument } from "../types";

interface PDFUploaderProps {
  sessionId?: number;
}

export function PDFUploader({ sessionId }: PDFUploaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPdfs, setUploadedPdfs] = useState<PdfDocument[]>([]);
  const [sessionPdfs, setSessionPdfs] = useState<PdfDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch PDFs when dialog opens
  const handleOpenDialog = async () => {
    setIsDialogOpen(true);
    try {
      // Fetch all user PDFs
      const { data: pdfs } = await pdfApi.listPdfs();
      setUploadedPdfs(pdfs);

      // If there's a session ID, fetch PDFs attached to this session
      if (sessionId) {
        const { data: sessionPdfs } = await pdfApi.listSessionPdfs(sessionId);
        setSessionPdfs(sessionPdfs);
      }
    } catch (error) {
      console.error("Failed to fetch PDFs:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const { data } = await pdfApi.uploadPdf(file);

      setUploadedPdfs((prev) => [...prev, data]);
      toast("PDF uploaded successfully");

      // If session ID is provided, automatically attach the PDF to session
      if (sessionId) {
        await pdfApi.addPdfToSession(sessionId, data.id);
        setSessionPdfs((prev) => [...prev, data]);
      }
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      toast("There was an error uploading your PDF.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const togglePdfInSession = async (pdf: PdfDocument) => {
    if (!sessionId) return;

    const isPdfInSession = sessionPdfs.some((p) => p.id === pdf.id);

    try {
      if (isPdfInSession) {
        await pdfApi.removePdfFromSession(sessionId, pdf.id);
        setSessionPdfs((prev) => prev.filter((p) => p.id !== pdf.id));
      } else {
        await pdfApi.addPdfToSession(sessionId, pdf.id);
        setSessionPdfs((prev) => [...prev, pdf]);
      }
    } catch (error) {
      console.error("Failed to update PDF in session:", error);
      toast("Operation failed");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        type="button"
        onClick={handleOpenDialog}
      >
        <FileUp className="h-4 w-4" />
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf"
        className="hidden"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage PDFs</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              Upload New PDF
            </Button>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {uploadedPdfs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No PDFs uploaded yet
                </p>
              ) : (
                uploadedPdfs.map((pdf) => {
                  const isInSession = sessionPdfs.some((p) => p.id === pdf.id);
                  return (
                    <div
                      key={pdf.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center">
                        <File className="h-4 w-4 mr-2" />
                        <span className="text-sm truncate max-w-[200px]">
                          {pdf.filename}
                        </span>
                      </div>
                      {sessionId && (
                        <Button
                          variant={isInSession ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePdfInSession(pdf)}
                        >
                          {isInSession ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </>
                          ) : (
                            <>
                              <FileUp className="h-3 w-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
