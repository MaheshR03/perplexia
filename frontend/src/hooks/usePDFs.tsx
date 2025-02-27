import { useState, useEffect, useCallback } from "react";
import { PDFDocument } from "@/types";
import { pdfApi } from "@/lib/api";
import { toast } from "sonner";

export function usePDFs(sessionId?: number) {
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const [sessionPdfs, setSessionPdfs] = useState<PDFDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load all user PDFs
  const loadPDFs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await pdfApi.listPDFs();
      if (error) throw new Error(error);
      setPdfs(data);
    } catch (error) {
      console.error("Failed to load PDFs:", error);
      toast.error("Failed to load your PDFs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load PDFs for current session
  const loadSessionPDFs = useCallback(async (sessionId: number) => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const { data, error } = await pdfApi.getSessionPDFs(sessionId);
      if (error) throw new Error(error);
      setSessionPdfs(data);
    } catch (error) {
      console.error(`Failed to load PDFs for session ${sessionId}:`, error);
      toast.error("Failed to load PDFs for this chat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload a new PDF
  const uploadPDF = async (file: File) => {
    setIsUploading(true);
    try {
      const { data, error } = await pdfApi.uploadPDF(file);
      if (error) throw new Error(error);

      toast.success("Your PDF has been processed successfully.");

      // Refresh PDF list
      await loadPDFs();
      return data.pdf_document_id;
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      toast.error("Failed to upload and process your PDF.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Add a PDF to current session
  const addPDFToSession = async (pdfId: number, sesId: number = sessionId!) => {
    if (!sesId) {
      toast.error("No active chat selected.");
      return;
    }

    try {
      const { data, error } = await pdfApi.addPDFToSession(sesId, pdfId);
      if (error) throw new Error(error);

      // Refresh session PDFs
      await loadSessionPDFs(sesId);

      toast.success("PDF added to chat context.");
    } catch (error) {
      console.error("Failed to add PDF to session:", error);
      toast.error("Failed to add PDF to chat.");
    }
  };

  // Remove a PDF from current session
  const removePDFFromSession = async (
    pdfId: number,
    sesId: number = sessionId!
  ) => {
    if (!sesId) {
      toast.error("No active chat selected.");
      return;
    }

    try {
      const { data, error } = await pdfApi.removePDFFromSession(sesId, pdfId);
      if (error) throw new Error(error);

      // Update session PDFs locally
      setSessionPdfs((prev) => prev.filter((pdf) => pdf.id !== pdfId));

      toast.success("PDF removed from chat context.");
    } catch (error) {
      console.error("Failed to remove PDF from session:", error);
      toast.error("Failed to remove PDF from chat.");
    }
  };

  // Load data on initial render if sessionId provided
  useEffect(() => {
    loadPDFs();
    if (sessionId) {
      loadSessionPDFs(sessionId);
    }
  }, [loadPDFs, loadSessionPDFs, sessionId]);

  return {
    pdfs,
    sessionPdfs,
    isLoading,
    isUploading,
    uploadPDF,
    addPDFToSession,
    removePDFFromSession,
  };
}
