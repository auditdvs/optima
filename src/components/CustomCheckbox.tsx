import { Check, X } from 'lucide-react';
import React from 'react';
import '../styles/checkbox.css';

type CheckState = null | true | false;

interface CustomCheckboxProps {
  checked: CheckState;
  onChange: (state: CheckState) => void;
  id: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange, id }) => {
  const handleClick = () => {
    // Cycle through states: null -> true -> false -> null
    if (checked === null) {
      onChange(true);
    } else if (checked === true) {
      onChange(false);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={handleClick}
        className={`h-5 w-5 rounded border ${
          checked === null
            ? 'border-gray-300 bg-white'
            : checked === true
            ? 'border-green-500 bg-green-100'
            : 'border-red-500 bg-red-100'
        } flex items-center justify-center`}
        aria-checked={checked === true}
        role="checkbox"
      >
        {checked === true && <Check className="h-3 w-3 text-green-600" />}
        {checked === false && <X className="h-3 w-3 text-red-600" />}
      </button>
    </div>
  );
};