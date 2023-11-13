import React from 'react';

interface PaperViewerProps {
  url: string;
}

const PaperViewer: React.FC<PaperViewerProps> = ({ url }) => {
  return (
    <div className="flex justify-center h-screen grow ">
      <iframe
        src={url}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default PaperViewer;
