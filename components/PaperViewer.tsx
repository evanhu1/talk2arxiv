"use client"
import { useState, useEffect } from "react";
import { FileText } from 'lucide-react';

const PaperViewer = ({ paper_id }: { paper_id: string }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const pdfUrl = isMobile
    ? `https://drive.google.com/viewerng/viewer?embedded=true&url=https://arxiv.org/pdf/${paper_id}`
    : `https://arxiv.org/pdf/${paper_id}`;

  return (
    <div className="h-full w-full relative bg-surface-0">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-surface-0">
          <FileText className="w-7 h-7 text-text-tertiary/60" />
          <p className="text-xs text-text-tertiary">Loading paper...</p>
        </div>
      )}
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
};

export default PaperViewer;
