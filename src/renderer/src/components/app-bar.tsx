import { Minus, X, LucideIcon, MonitorCog } from 'lucide-react';
import './app-bar.css';
import { Label } from './ui/label';
import { useTheme } from 'next-themes';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { capitalizeFirstLetter } from '@renderer/lib/capitalize';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Button } from './ui/button';
const { ipcRenderer } = window.require('electron');
import { IoIosColorPalette } from 'react-icons/io';

interface AppBarButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  className?: string;
}

function AppBarButton({ onClick, icon: Icon, className }: AppBarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-full p-1 flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted ${className}`}
    >
      <Icon height={12} />
    </button>
  );
}

export default function AppBar() {
  const { themes, setTheme, theme } = useTheme();

  const handleMinimize = () => {
    ipcRenderer.send('app:minimize');
  };

  const handleClose = () => {
    ipcRenderer.send('app:close');
  };

  return (
    <div className="flex items-center  justify-center bg-secondary px-1">
      <div className="w-full app-bar gap-1  h-8 text-primary  flex items-center justify-start">
        <MonitorCog />
        <Label>Changelog Generator</Label>
      </div>
      <div className="h-full flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-5 h-full p-1 flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted`}
            >
              <IoIosColorPalette height={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <ScrollArea className="h-[50vh]">
              {themes.map((actual) => {
                function capitalizeTheme(theme: string): string {
                  // Separar o nome e sobrenome e capitalizar
                  const parts = theme.split('-');
                  const capitalizedParts = parts.map((part) =>
                    capitalizeFirstLetter(part),
                  );
                  return capitalizedParts.join(' ');
                }
                return (
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme(actual);
                    }}
                    key={actual}
                    className={
                      actual === theme
                        ? 'border-r-[4px] border-primary mr-1'
                        : 'mr-1'
                    }
                  >
                    {capitalizeTheme(actual)}
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
        <AppBarButton
          onClick={handleMinimize}
          icon={Minus}
          className="hover:bg-gray-500"
        />
        <AppBarButton onClick={handleClose} icon={X} />
      </div>
    </div>
  );
}
