import React from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  keywords: string[];
}

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">{document.type}</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">{document.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{document.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </a>
        <a
          href={`${document.fileUrl}&export=download`}
          target='_blank'
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </div>
    </div>
  );
}
