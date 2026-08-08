import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Returns how many pixels the on-screen keyboard overlaps the bottom of the
 * viewport. Used so chat/composer stay visible on mobile web + native.
 */
export function useKeyboardBottomInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const vv = window.visualViewport;
      if (!vv) return;

      const update = () => {
        // Amount of layout viewport covered by keyboard / browser chrome
        const covered = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop
        );
        setInset(covered > 40 ? covered : 0);
      };

      update();
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      window.addEventListener('focusin', update);
      window.addEventListener('focusout', update);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
        window.removeEventListener('focusin', update);
        window.removeEventListener('focusout', update);
      };
    }

    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setInset(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
