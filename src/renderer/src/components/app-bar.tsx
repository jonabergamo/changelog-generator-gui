import { Square, Minus, X, LucideIcon, MonitorCog } from 'lucide-react'
import './app-bar.css'
import { Label } from './ui/label'
const { ipcRenderer } = window.require('electron')

interface AppBarButtonProps {
  onClick: () => void
  icon: LucideIcon
  className?: string
}

function AppBarButton({ onClick, icon: Icon, className }: AppBarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-full p-1 flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-muted ${className}`}
    >
      <Icon height={12} />
    </button>
  )
}

export default function AppBar() {
  const handleMinimize = () => {
    ipcRenderer.send('app:minimize')
  }

  const handleMaximize = () => {
    ipcRenderer.send('app:maximize')
  }

  const handleClose = () => {
    ipcRenderer.send('app:close')
  }

  return (
    <div className="flex items-center  justify-center bg-secondary px-1">
      <div className="w-full app-bar gap-1  h-8 text-primary  flex items-center justify-start">
        <MonitorCog />
        <Label>Changelog Generator</Label>
      </div>
      <div className="h-full flex items-center justify-center">
        <AppBarButton onClick={handleMinimize} icon={Minus} className="hover:bg-gray-500" />
        <AppBarButton onClick={handleMaximize} icon={Square} />
        <AppBarButton onClick={handleClose} icon={X} />
      </div>
    </div>
  )
}
