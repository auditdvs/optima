import { Palette } from 'lucide-react';
import { ThemeColor, useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';

export function ThemeSelector() {
  const { themeColor, setThemeColor } = useTheme();
  
  const themes: { color: ThemeColor; label: string }[] = [
    { color: 'indigo', label: 'Indigo' },
    { color: 'blue', label: 'Blue' },
    { color: 'green', label: 'Green' },
    { color: 'red', label: 'Red' },
    { color: 'purple', label: 'Purple' },
    { color: 'amber', label: 'Amber' },
    { color: 'pink', label: 'Pink' },
    { color: 'rose', label: 'Rose' },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Palette size={20} />
        <h3 className="font-medium">Choose Theme Color</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme) => (
          <Button
            key={theme.color}
            variant={themeColor === theme.color ? "default" : "outline"}
            className={`
              ${themeColor === theme.color 
                ? `bg-${theme.color}-600 hover:bg-${theme.color}-700` 
                : ''} 
              px-3 py-1 h-auto
            `}
            onClick={() => setThemeColor(theme.color)}
          >
            <div className={`w-3 h-3 rounded-full bg-${theme.color}-500 mr-2`}></div>
            {theme.label}
          </Button>
        ))}
      </div>
    </div>
  );
}