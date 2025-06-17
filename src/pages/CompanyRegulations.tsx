import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import toast from "react-hot-toast"; // Ganti dengan library toast yang kamu pakai
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import '../styles/companyRegulations.css';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Document type definition matching your table structure
interface Document {
  id: string;
  title: string;
  description: string;
  type: string;
  file_url: string;
  file_size: string;
  keywords: string[];
  date: string;
  created_at: string; // Add this line
  fileUrl?: string; // For backward compatibility
}

// First, add a helper function to check if document is new (add this before the component)
const isNewDocument = (createdAt: string) => {
  const documentDate = new Date(createdAt);
  const currentDate = new Date();
  const diffTime = currentDate.getTime() - documentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

export default function CompanyRegulations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    type: '',
    keywords: '',
    file: null as File | null
  });

  useEffect(() => {
    // Fetch user role from session
    async function fetchUserRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: userRole, error } = await supabase
            .from('user_roles')  // Changed from user_profiles to user_roles
            .select('role')
            .eq('user_id', session.user.id)
            .single();
            
          if (error) throw error;
          setUserRole(userRole?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }
    
    fetchUserRole();
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*');
      
      if (error) throw error;

      // Process the data to match the expected format
      const formattedDocs = data.map(doc => ({
        ...doc,
        keywords: Array.isArray(doc.keywords) ? doc.keywords : (doc.keywords ? JSON.parse(doc.keywords) : []),
        fileUrl: doc.file_url, // Map for compatibility with existing code
      }));

      setDocuments(formattedDocs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Check if user has permission to add documents
  const hasAddPermission = userRole === 'manager' || userRole === 'superadmin';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDocument(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocument.file || !newDocument.title) {
      toast.error("Please fill in all required fields and upload a file");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Upload file to Supabase storage
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`; 

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')  // Changed to 'documents'
        .upload(filePath, newDocument.file);

      if (uploadError) throw uploadError;

      // 2. Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('documents')  // Changed to 'documents'
        .getPublicUrl(filePath);

      // 3. Parse keywords string to array
      const keywordsArray = newDocument.keywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);

      // 4. Insert document record in the database - removing the 'date' field
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: newDocument.title,
          description: newDocument.description,
          type: newDocument.type,
          file_url: publicUrlData.publicUrl,
          file_size: `${(newDocument.file.size / (1024 * 1024)).toFixed(1)} MB`,
          keywords: keywordsArray,
          // Remove the date field since it doesn't exist in the table
          // date: new Date().toISOString().split('T')[0],
        });

      if (insertError) throw insertError;

      toast.success("Document added successfully");
      
      // Reset form and close modal
      setNewDocument({
        title: '',
        description: '',
        type: '',
        keywords: '',
        file: null
      });
      setIsAddModalOpen(false);
      
      // Refresh documents list
      fetchDocuments();

    } catch (error) {
      console.error('Error adding document:', error);
      toast.error("Failed to add document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modify the filteredDocuments useMemo to include sorting
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    // Apply search filter if query exists
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      filtered = documents.filter(doc => {
        const searchableText = `${doc.title} ${doc.description} ${doc.type} ${doc.keywords.join(' ')}`.toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Sort by created_at in descending order (newest first)
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [searchQuery, documents]);

  const handleDeleteConfirmation = (document: Document) => {
    setDocumentToDelete(document);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // 1. Delete the document from storage first
      const fileUrl = documentToDelete.file_url;
      const fileName = fileUrl.split('/').pop()?.split('?')[0];
      
      if (fileName) {
        try {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([fileName]);
            
          if (storageError) {
            console.warn('Warning: Could not delete file from storage:', storageError);
          }
        } catch (storageError) {
          console.warn('Warning: Storage deletion failed:', storageError);
        }
      }
      
      // 2. Delete the document record from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .match({ id: documentToDelete.id });
    
      if (dbError) {
        throw dbError;
      }
    
      // 3. Update UI on success
      toast.success("Document deleted successfully");
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentToDelete.id));
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error("Failed to delete document. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Assuming you have a form handler function
  const handleDocumentUpload = async (formData: FormData) => {
    const documentTitle = formData.get('documentTitle');
    const file = formData.get('file') as File;
    
    if (!documentTitle || !file) {
        throw new Error('Document title and file are required');
    }

    // Get file extension from original file
    const fileExtension = file.name.split('.').pop();
    
    // Create new filename using document title
    const sanitizedTitle = documentTitle
        .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
        .toLowerCase();
    const newFilename = `${sanitizedTitle}.${fileExtension}`;

    // Create new File object with renamed file
    const renamedFile = new File([file], newFilename, {
        type: file.type,
    });

    // Upload to bucket with new filename
    try {
        await uploadToBucket(renamedFile);
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 rounded-lg bg-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-slow">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Company Regulations</h1>
            
            <div className="flex items-center gap-4">
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
              
              {/* Add Document Button - only visible for authorized roles */}
              {(userRole === 'manager' || userRole === 'superadmin') && (
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Add Document
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-4">
        <div className="pt-0 pb-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-2 text-gray-500">Loading documents...</p>
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 mt-8">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredDocuments.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              No documents match your search
            </div>
          )}

          {!isLoading && !error && filteredDocuments.length > 0 && (
            <div className="mt-6 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="h-full flex flex-col transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold">{doc.title}</CardTitle>
                      {isNewDocument(doc.created_at) && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-lime-100 text-lime-700 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 mt-2">
                      {doc.type}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 mb-1">
                      {expandedDescriptions[doc.id] ? (
                        // Full view
                        <p>{doc.description}</p>
                      ) : (
                        // Less view - truncate to 100 characters
                        <p>
                          {doc.description.length > 100 
                            ? `${doc.description.substring(0, 100)}...` 
                            : doc.description}
                        </p>
                      )}
                      
                      {doc.description.length > 100 && (
                        <button 
                          onClick={() => toggleDescription(doc.id)}
                          className="text-sky-600 hover:text-sky-800 text-xs mt-1 focus:outline-none"
                        >
                          {expandedDescriptions[doc.id] ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.keywords.map((keyword, index) => (
                        <span key={index} className="text-xs px-2 py-1 rounded-full bg-sky-50 text-sky-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center mt-auto">
                    <div className="flex items-center gap-4">
                      <a 
                        href={doc.fileUrl || doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-800 text-sm font-medium transition-colors"
                      >
                        View document
                      </a>
                      {(userRole === 'manager' || userRole === 'superadmin') && (
                        <span
                          onClick={() => handleDeleteConfirmation(doc)}
                          className="text-rose-500 hover:text-rose-700 text-sm font-medium cursor-pointer"
                        >
                          Delete
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {doc.file_size}
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Document Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new company document.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={newDocument.title}
                  onChange={handleInputChange}
                  placeholder="Enter document title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Document Type *</Label>
                <Input
                  id="type"
                  name="type"
                  value={newDocument.type}
                  onChange={handleInputChange}
                  placeholder="e.g., Policy, Guideline, Form"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newDocument.description}
                  onChange={handleInputChange}
                  placeholder="Provide a brief description of the document"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  name="keywords"
                  value={newDocument.keywords}
                  onChange={handleInputChange}
                  placeholder="Enter keywords separated by commas"
                />
                <p className="text-xs text-gray-500">Separate keywords with commas</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file">Document File *</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  required
                />
                <p className="text-xs text-gray-500">Supported formats: PDF, DOCX, XLSX (max 10MB)</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Add Document'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteDocument}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}