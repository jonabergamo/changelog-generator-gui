import AppBar from './components/app-bar';
import CustomToaster from './components/custom-toaster';
import { Home } from './pages/home';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from './components/ui/tooltip';

function App(): JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={[
        'light',
        'dark',
        'green',
        'green-dark',
        'dracula',
        'dracula-dark',
        'gold',
        'gold-dark',
        'poimandres',
        'discord',
        'discord-dark',
        'adj',
        'adj-dark',
        'soft-purple',
        'soft-purple-dark',
        'umbra-protocol',
        'min-light',
        'min-dark',
        'aura-dark',
        'pro-hacker',
        'tokyo-city-lighter',
        'ayu-light-bordered',
      ]}
    >
      <Router>
        <div className="flex flex-col h-screen overflow-hidden">
          <TooltipProvider>
            <CustomToaster />
            <AppBar />
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Home />} />
              </Routes>
            </div>
          </TooltipProvider>
        </div>
      </Router>
    </NextThemesProvider>
  );
}

export default App;
