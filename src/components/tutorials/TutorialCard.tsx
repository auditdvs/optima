import { Download } from 'lucide-react';
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../ui/card';

interface TutorialCardProps {
  title: string;
  description: string;
  url: string;
  buttonText?: string;
  icon?: React.ReactNode;
}

export function TutorialCard({ title, description, url, buttonText = "Download Tutorial", icon }: TutorialCardProps) {
  const { themeColor } = useTheme();
  
  const themeClasses = {
    indigo: {
      hoverShadow: 'hover:shadow-indigo-100',
      hoverBg: 'hover:bg-indigo-50/30',
      title: 'group-hover:text-indigo-700',
      button: 'bg-indigo-600 hover:bg-indigo-700',
    },
    blue: {
      hoverShadow: 'hover:shadow-blue-100',
      hoverBg: 'hover:bg-blue-50/30',
      title: 'group-hover:text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    green: {
      hoverShadow: 'hover:shadow-green-100',
      hoverBg: 'hover:bg-green-50/30',
      title: 'group-hover:text-green-700',
      button: 'bg-green-600 hover:bg-green-700',
    },
    red: {
      hoverShadow: 'hover:shadow-red-100',
      hoverBg: 'hover:bg-red-50/30',
      title: 'group-hover:text-red-700',
      button: 'bg-red-600 hover:bg-red-700',
    },
    purple: {
      hoverShadow: 'hover:shadow-purple-100',
      hoverBg: 'hover:bg-purple-50/30',
      title: 'group-hover:text-purple-700',
      button: 'bg-purple-600 hover:bg-purple-700',
    },
    amber: {
      hoverShadow: 'hover:shadow-amber-100',
      hoverBg: 'hover:bg-amber-50/30',
      title: 'group-hover:text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    pink: {
      hoverShadow: 'hover:shadow-pink-100',
      hoverBg: 'hover:bg-pink-50/30',
      title: 'group-hover:text-pink-700',
      button: 'bg-pink-600 hover:bg-pink-700',
    },
    rose: {
      hoverShadow: 'hover:shadow-rose-100',
      hoverBg: 'hover:bg-rose-50/30',
      title: 'group-hover:text-rose-700',
      button: 'bg-rose-600 hover:bg-rose-700',
    },
  };
  
  const currentTheme = themeClasses[themeColor];

  return (
    <Card className={`flex flex-col h-full transition-all duration-300 hover:shadow-lg ${currentTheme.hoverShadow} hover:scale-[1.02] ${currentTheme.hoverBg} group`}>
      <CardHeader>
        <CardTitle className={`transition-colors ${currentTheme.title}`}>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow"></CardContent>
      <CardFooter>
        <Button
          asChild
          className={`w-full gap-2 ${currentTheme.button} transition-all`}
        >
          <a
            href={url}
            download
            className="flex items-center justify-center"
          >
            {icon || (
              <Download
                size={16}
                className="transition-transform group-hover:animate-bounce"
              />
            )}
            <span>{buttonText}</span>
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}