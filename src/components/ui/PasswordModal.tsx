import { X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  passwordError: boolean;
}

const PasswordModal = ({
  isOpen,
  onClose,
  onSubmit,
  passwordInput,
  setPasswordInput,
  passwordError
}: PasswordModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={18} />
        </button>
        
        <h3 className="text-lg font-medium mb-4">Enter Password</h3>
        <p className="text-sm text-gray-600 mb-4">Enter password to view fraud details</p>
        
        <div className="space-y-4">
          <div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className={`w-full px-3 py-2 border rounded ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-500 mt-1">Incorrect password</p>
            )}
          </div>
          
          <button
            onClick={onSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;