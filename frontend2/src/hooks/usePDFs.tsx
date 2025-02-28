import { useState, useEffect, useCallback } from "react";
import { PDFDocument } from "@/types";
import { pdfApi } from "@/lib/api";
import { toast } from "sonner";

export function usePDFs() {
  const [pdfs, setPDFs] = useState<PDFDocument[]>([]);
  const [sessionPdfs, setSessionPDFs] = useState<PDFDocument[]>([]);

  const loadPDFs = useCallback(async () => {
    try {
      const { data, error } = await pdfApi.listPDFs();
      if (error) throw new Error(error);
      setPDFs(data);
    } catch (error) {
      console.error("Failed to load PDFs:", error);
      toast("Error", {
        description: "Failed to load PDFs.",
      });
    }
  }, []);

  const uploadPDF = useCallback(async (file: File) => {
    try {
      const { data, error } = await pdfApi.uploadPDF(file);
      if (error) throw new Error(error);
      toast("Success", {
        description: "PDF uploaded successfully.",
      });
      loadPDFs(); // Reload PDFs after upload
      return data.pdf_document_id;
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      toast("Error", {
        description: "Failed to upload PDF.",
      });
      return null;
    }
  }, [loadPDFs]);

  const addPDFToSession = useCallback(async (pdfId: number, sessionId: number) => {
    try {
      const { data, error } = await pdfApi.addPDFToSession(sessionId, pdfId);
      if (error) throw new Error(error);
      toast("Success", {
        description: "PDF added to session successfully.",
      });
      loadSessionPDFs(sessionId); // Reload session PDFs after adding
    } catch (error) {
      console.error("Failed to add PDF to session:", error);
      toast("Error", {
        description: "Failed to add PDF to session.",
      });
    }
  }, [loadSessionPDFs]);

  const loadSessionPDFs = useCallback(async (sessionId: number) => {
    try {
      const { data, error } = await pdfApi.getSessionPDFs(sessionId);
      if (error) throw new Error(error);
      setSessionPDFs(data);
    } catch (error) {
      console.error("Failed to load session PDFs:", error);
      toast("Error", {
        description: "Failed to load session PDFs.",
      });
    }
  }, []);

  return {
    pdfs,
    sessionPdfs,
    loadPDFs,
    uploadPDF,
    addPDFToSession,
    loadSessionPDFs,
  };
}
