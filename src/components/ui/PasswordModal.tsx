import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  passwordError: boolean;
  title?: string;
  description?: string;
}

const PasswordModal = ({
  isOpen,
  onClose,
  onSubmit,
  passwordError,
  title = "Enter Password",
  description = "Enter password to view fraud details"
}: PasswordModalProps) => {
  // Local state for the password input
  const [localPassword, setLocalPassword] = useState('');
  
  // Reset local password when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setLocalPassword('');
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    onSubmit(localPassword);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-80 relative shadow-md">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-200"
        >
          <X size={18} />
        </button>
        
        <h3 className="text-lg font-medium mb-4 text-gray-200">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{description}</p>
        
        <div className="space-y-4">
          <div>
            <input
              type="password"
              value={localPassword}
              onChange={(e) => setLocalPassword(e.target.value)}
              placeholder="Password"
              className={`w-full px-3 py-2 bg-gray-700 text-gray-200 border-0 rounded-md focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ease-in-out duration-150 ${
                passwordError ? 'ring-1 ring-red-500' : ''
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-500 mt-1">Incorrect password</p>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-2 px-4 rounded-md hover:from-green-600 hover:to-blue-600 transition ease-in-out duration-150"
          >
            Submit
          </button>
          
          <div className="flex justify-center mt-4">
            <button 
              onClick={onClose}
              className="text-sm text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;