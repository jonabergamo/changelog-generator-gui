import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type UseColorProps = {
  variable: string;
  convert?: boolean; // Propriedade opcional para ativar conversão
};

// Função auxiliar para converter HSL para HEX
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function useColor({ variable, convert = false }: UseColorProps) {
  const { theme } = useTheme();
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    if (typeof document !== 'undefined') {
      const computedColor = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${variable}`)
        .trim();
      return computedColor;
    }
    return ''; // Fallback para renderização no servidor
  });

  useEffect(() => {
    const updateColor = () => {
      if (typeof document === 'undefined') return; // Garantir que estamos no navegador

      let color = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${variable}`)
        .trim();

      if (theme) {
        // Se o tema estiver ativo, use a variável CSS
        color = color;
      } else {
        // Cor de fallback quando o tema não está ativo
        color = '229 100% 62%'; // Exemplo de valores HSL de fallback
      }

      if (convert) {
        // Parse da string HSL e conversão para HEX
        const hslMatch = color.match(
          /(\d+(\.\d+)?)\s+(\d+(\.\d+)?)%\s+(\d+(\.\d+)?)%/,
        );
        if (hslMatch) {
          const h = parseFloat(hslMatch[1]);
          const s = parseFloat(hslMatch[3]);
          const l = parseFloat(hslMatch[5]);
          const hexColor = hslToHex(h, s, l);
          setPrimaryColor(hexColor);
        } else {
          console.warn(
            `Formato de cor para '--${variable}' não é válido HSL. Recebido: ${color}`,
          );
          setPrimaryColor(color); // Fallback para a cor original se o formato for inesperado
        }
      } else {
        // Usar o formato de cor original
        setPrimaryColor(color);
      }
    };

    // Adiciona um pequeno atraso para garantir que as mudanças de tema sejam aplicadas
    const timeoutId = setTimeout(updateColor, 100);

    return () => clearTimeout(timeoutId);
  }, [theme, variable, convert]);

  return primaryColor;
}
