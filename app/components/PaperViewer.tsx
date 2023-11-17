import { useState, useEffect } from 'react';

const PaperViewer: React.FC = () => {
  const [paperId, setPaperId] = useState<string>("");

  useEffect(() => {
    setPaperId(window.location.pathname.substring(1));
  }, []);

  return (
    <div className="flex justify-center h-screen grow ">
      <iframe
        src={`https://arxiv.org/${paperId}`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default PaperViewer;
