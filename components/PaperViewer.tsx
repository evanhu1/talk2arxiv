import { useState, useEffect } from "react";

const PaperViewer = ({ paper_id }: { paper_id: string }) => {
  const mobile = window.innerWidth < 768;

  return (
    <div className="flex justify-center h-screen grow ">
      <iframe
        src={
          (mobile
            ? "https://drive.google.com/viewerng/viewer?embedded=true&url="
            : "") + `https://arxiv.org/pdf/${paper_id}`
        }
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default PaperViewer;
