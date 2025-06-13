import { MapPin, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { BranchLocationTable, BranchRow } from "../components/dashboard/BranchLocationTable";
import { supabase } from '../lib/supabaseClient';

interface BranchData {
  id: string;
  name: string;
  region: string;
  coordinates: string;
}

const UpdateLocation: React.FC = () => {
  const [branchData, setBranchData] = useState<BranchData>({
    id: '',
    name: '',
    region: '',
    coordinates: '',
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*');

        if (error) throw error;
        if (data) {
          setBranches(data);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };

    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only update the coordinates field
      const { error } = await supabase
        .from('branches')
        .update({
          coordinates: branchData.coordinates,
        })
        .eq('id', branchData.id);

      if (error) throw error;
      setMessage({ text: 'Branch location updated successfully!', type: 'success' });
      
      // Close modal after successful update with a slight delay
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage(null);
        setBranchData({ id: '', name: '', region: '', coordinates: '' });
        setSelectedBranch(null);
      }, 1500);
      
      // Refresh branches after update
      const { data } = await supabase.from('branches').select('*');
      if (data) setBranches(data);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: 'Failed to update branch location', type: 'error' });
    }
  };

  // Format coordinates for Google Maps link
  const getCoordinatesText = (coordinates: any) => {
    if (!coordinates) return '';
    try {
      if (typeof coordinates === 'string' && coordinates.toLowerCase().includes('point')) {
        const match = coordinates.match(/point\(\s*([^,\s]+)\s+([^,\s]+)\s*\)/i);
        if (match) {
          const [_, lng, lat] = match;
          return `${lat},${lng}`;
        }
      }
      return coordinates;
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return '';
    }
  };

  // Handle opening the edit modal
  const openEditModal = (branch: BranchData) => {
    setSelectedBranch(branch);
    setBranchData({
      id: branch.id,
      name: branch.name,
      region: branch.region,
      coordinates: branch.coordinates,
    });
    setIsModalOpen(true);
  };

  // Filter branches based on search term
  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare data for BranchLocationTable
  const branchTableData: BranchRow[] = filteredBranches.map(branch => ({
    name: branch.name,
    region: branch.region,
    location: (
      <a
        href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
      >
        View on Maps
      </a>
    ),
    actions: (
      <button
        onClick={() => openEditModal(branch)}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Edit
      </button>
    )
  }));

  return (
    <div className="space-y-6">
      {/* Header with title and update button in the same row */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Branch Locations</h1>
        
        {/* Update Location Button */}
        <button
          onClick={() => {
            setBranchData({ id: '', name: '', region: '', coordinates: '' });
            setSelectedBranch(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <MapPin size={18} />
          Update Branch Location
        </button>
      </div>
      
      {/* Branch Location Table Section */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-lg font-semibold mb-2 sm:mb-0">Branch Directory</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search branch name or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border rounded-md w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto">
          <BranchLocationTable data={branchTableData} />
        </div>
      </div>
      
      {/* Modal for Branch Update */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Update Branch Location
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setMessage(null);
                  setSelectedBranch(null);
                }} 
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            
            {/* Display message if any */}
            {message && (
              <div
                className={`p-4 mb-4 rounded-md ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Branch Selection Dropdown */}
              <div className="mb-4">
                <label htmlFor="branch-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Branch to Update
                </label>
                <select
                  id="branch-select"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onChange={(e) => {
                    const branch = branches.find(b => b.id === e.target.value);
                    if (branch) {
                      setSelectedBranch(branch);
                      setBranchData({
                        id: branch.id,
                        name: branch.name,
                        region: branch.region,
                        coordinates: branch.coordinates,
                      });
                    } else {
                      setSelectedBranch(null);
                      setBranchData({ id: '', name: '', region: '', coordinates: '' });
                    }
                  }}
                  value={selectedBranch?.id || ''}
                  required
                >
                  <option value="">-- Select a branch --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.region}
                    </option>
                  ))}
                </select>
              </div>

              {/* Only show the coordinates field if a branch is selected */}
              {selectedBranch && (
                <div>
                  <label htmlFor="coordinates" className="block text-sm font-medium text-gray-700">
                    Coordinates (latitude,longitude)
                  </label>
                  <input
                    type="text"
                    id="coordinates"
                    value={branchData.coordinates}
                    onChange={(e) => setBranchData({ ...branchData, coordinates: e.target.value })}
                    placeholder="-6.2088,106.8456"
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">Format: latitude,longitude (e.g., -6.2088,106.8456)</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setMessage(null);
                    setSelectedBranch(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={!selectedBranch}
                >
                  Update Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateLocation;