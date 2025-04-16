import React from 'react';
import '../styles/checkbox.css';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange, id }) => {
  return (
    <div className="checkbox-wrapper">
      <input
        type="checkbox"
        id={id}
        className="inp-cbx"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="cbx">
        <span>
          <svg viewBox="0 0 12 10" height="10px" width="12px">
            <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
          </svg>
        </span>
      </label>
    </div>
  );
};