import React from "react";
import { PDFManager as PDFManagerComponent } from "@/components/pdf/PDFManager";

export function PDFManager() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Document Manager</h1>
      <PDFManagerComponent />
    </div>
  );
}
