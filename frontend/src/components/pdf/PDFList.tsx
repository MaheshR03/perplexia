import { PDFDocument } from "@/types";
import { Button } from "@/components/ui/button";
import { FileIcon, XIcon } from "lucide-react";
import { usePDFs } from "@/hooks/usePDFs";
import { useChat } from "@/hooks/useChat";

interface PDFListProps {
  pdfs: PDFDocument[];
  isSession?: boolean;
  onSelectPDF?: (pdfId: number) => void;
}

export function PDFList({
  pdfs,
  isSession = false,
  onSelectPDF,
}: PDFListProps) {
  const { removePDFFromSession } = usePDFs();
  const { currentSessionId } = useChat();

  const handleRemove = async (pdfId: number) => {
    if (currentSessionId) {
      await removePDFFromSession(pdfId, currentSessionId);
    }
  };

  if (pdfs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        {isSession ? "Active Documents" : "Your Documents"}
      </h3>

      <div className="flex flex-wrap gap-2">
        {pdfs.map((pdf) => (
          <div
            key={pdf.id}
            className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-xs max-w-xs"
          >
            <FileIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{pdf.filename}</span>

            {isSession ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full"
                onClick={() => handleRemove(pdf.id)}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full"
                onClick={() => onSelectPDF?.(pdf.id)}
              >
                <span className="text-xs">+</span>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
