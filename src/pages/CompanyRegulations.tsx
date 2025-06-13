import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo, useState } from 'react';
import { documents } from '../data/documents';
import '../styles/companyRegulations.css';

export default function CompanyRegulations() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    
    const searchTerms = searchQuery.toLowerCase().split(' ');
    return documents.filter(doc => {
      const searchableText = `${doc.title} ${doc.description} ${doc.type} ${doc.keywords.join(' ')}`.toLowerCase();
      return searchTerms.every(term => searchableText.includes(term));
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 rounded-lg bg-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-slow">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Company Regulations</h1>
            
            {/* Search bar */}
            <div className="relative w-64 md:w-80">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="peer w-full pl-10 pr-2 py-2 text-base border-0 border-b-2 border-gray-300 bg-transparent outline-none transition-colors focus:border-indigo-500"
              />
              {/* Underline animation */}
              <div className="absolute bottom-0 left-0 h-0.5 w-full scale-x-0 bg-indigo-500 transition-transform duration-300 peer-focus:scale-x-100"></div>

              {/* Highlight background on focus */}
              <div className="absolute bottom-0 left-0 h-full w-0 bg-indigo-500/10 transition-all duration-300 peer-focus:w-full"></div>

              {/* Search icon */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300 peer-focus:text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth="2"
                    stroke="currentColor"
                    d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-4">
        <div className="pt-0 pb-4">
          {filteredDocuments.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No documents match your search
            </div>
          ) : (
            <div className="mt-6 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">{doc.title}</CardTitle>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {doc.type}
                      </span>
                    </div>
                    <CardDescription className="text-sm text-gray-500 mt-1">
                      {doc.date}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-2">{doc.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.keywords.map((keyword, index) => (
                        <span key={index} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors">
                      View document
                    </button>
                    <span className="text-xs text-gray-500">
                      {doc.fileSize}
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}