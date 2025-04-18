import React from 'react';
import '../styles/checkbox.css';

interface CustomCheckboxProps {
  checked: boolean | null;
  onChange: (state: boolean | null) => void;
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
    <div className="checkbox-wrapper" onClick={handleClick}>
      <div className={`checkbox-state ${
        checked === null ? 'state-none' :
        checked ? 'state-checked' :
        'state-crossed'
      }`}>
        {checked === true && (
          <svg viewBox="0 0 12 10" className="check-icon">
            <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
          </svg>
        )}
        {checked === false && (
          <svg viewBox="0 0 12 12" className="cross-icon">
            <path d="M2 2 L10 10 M10 2 L2 10"></path>
          </svg>
        )}
      </div>
    </div>
  );
};