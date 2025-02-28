import React from "react";
import { PDFDocument } from "@/types";
import { Button } from "@/components/ui/button";

interface PDFListProps {
  pdfs: PDFDocument[];
  isSession?: boolean;
  onSelectPDF?: (pdfId: number) => void;
}

export function PDFList({ pdfs, isSession = false, onSelectPDF }: PDFListProps) {
  return (
    <div className="space-y-2">
      {pdfs.map((pdf) => (
        <div
          key={pdf.id}
          className="flex items-center justify-between p-2 border rounded-md"
        >
          <div>
            <p className="text-sm font-medium">{pdf.name}</p>
            <p className="text-xs text-gray-500">
              {new Date(pdf.created_at).toLocaleDateString()}
            </p>
          </div>
          {isSession && onSelectPDF && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectPDF(pdf.id)}
            >
              Select
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
