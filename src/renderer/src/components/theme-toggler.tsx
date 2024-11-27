import { useTheme } from 'next-themes';

export function ThemeToggler() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex border-[1.5px] w-1/5 border-slate-100  rounded-md bg-transparent text-sm font-medium">
      <button
        onClick={() => setTheme('light')}
        className={`${
          theme == 'light' ? 'bg-primary text-primary-foreground' : ''
        } px-4 py-2 rounded-l-md w-1/3`}
      >
        Claro
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`${
          theme == 'dark' ? 'bg-primary  text-primary-foreground' : ''
        } px-4 py-2 w-1/3`}
      >
        Escuro
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`${
          theme == 'system' ? 'bg-primary text-primary-foreground' : ''
        } px-4 py-2 rounded-r-md w-1/3`}
      >
        Sistema
      </button>
    </div>
  );
}
