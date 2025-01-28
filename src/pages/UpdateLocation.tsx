import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: branchData.name,
          region: branchData.region,
          coordinates: branchData.coordinates,
        })
        .eq('id', branchData.id);

      if (error) throw error;
      setMessage({ text: 'Branch updated successfully!', type: 'success' });
      setBranchData({ id: '', name: '', region: '', coordinates: '' });
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: 'Failed to update branch', type: 'error' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Branch Name
          </label>
          <input
            type="text"
            id="name"
            value={branchData.name}
            onChange={(e) => setBranchData({ ...branchData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="region" className="block text-sm font-medium text-gray-700">
            Region
          </label>
          <input
            type="text"
            id="region"
            value={branchData.region}
            onChange={(e) => setBranchData({ ...branchData, region: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">Format: latitude,longitude (e.g., -6.2088,106.8456)</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Update Branch
        </button>
      </div>
    </form>
  );
};

export default UpdateLocation;