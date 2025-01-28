import React from 'react';
import { FileDown } from 'lucide-react';

interface TutorialCardProps {
  title: string;
  description: string;
  url: string;
}

export function TutorialCard({ title, description, url }: TutorialCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all hover:shadow-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        <a
          href={url}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileDown className="h-4 w-4" />
          Download Tutorial
        </a>
      </div>
    </div>
  );
}
