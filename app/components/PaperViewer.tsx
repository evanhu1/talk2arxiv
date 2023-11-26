import { useState, useEffect } from 'react';

const PaperViewer = ({ paper_id }: { paper_id: string }) => {
  return (
    <div className="flex justify-center h-screen grow ">
      <iframe
        src={`https://arxiv.org/pdf/${paper_id}`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default PaperViewer;
