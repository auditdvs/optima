import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserRoundPlus } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';

function AddUser() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Gunakan service role untuk membuat pengguna, tapi dalam konteks yang terpisah
      const adminAuth = supabaseService.auth.admin;
      const { data: userData, error: signUpError } = await adminAuth.createUser({
        email,
        password: 'auditoptima',
      });

      if (signUpError) throw signUpError;

      if (userData.user) {
        // Tambahkan role user ke tabel user_roles menggunakan service client
        const { error: roleError } = await supabaseService
          .from('user_roles')
          .insert([
            {
              user_id: userData.user.id,
              role: 'user',
            },
          ]);

        if (roleError) throw roleError;

        setMessage({
          text: 'User created successfully with default password: auditoptima',
          type: 'success',
        });
        setEmail('');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage({
        text: 'Failed to create user. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <UserRoundPlus className="h-8 w-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter user's email address"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating User...' : 'Create User'}
            </button>
          </div>
        </form>

        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Note: The user will be created with the default password: <code className="bg-gray-100 px-2 py-1 rounded">auditoptima</code>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            They should change their password after first login using the password reset feature.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AddUser;
