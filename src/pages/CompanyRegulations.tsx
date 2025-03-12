import { useMemo, useState } from 'react';
import { DocumentCard } from '../components/DocumentCard';
import { SearchBar } from '../components/SearchBar';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Company Regulations</h1>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-0 pb-4">
          <div className="search-container mb-0">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No documents match your search
            </div>
          ) : (
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto scroll-container">
              <div className="documents-grid mt-6 mb-6">
              {filteredDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}