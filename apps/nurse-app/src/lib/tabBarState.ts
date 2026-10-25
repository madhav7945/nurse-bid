type Listener = (visible: boolean) => void;
let isVisible = true;
const listeners = new Set<Listener>();

export const setTabBarVisible = (visible: boolean) => {
  isVisible = visible;
  listeners.forEach((l) => {
    try {
      l(visible);
    } catch (e) {
      console.warn("tabBarState listener error:", e);
    }
  });
};

export const getTabBarVisible = (): boolean => isVisible;

export const subscribeTabBarVisible = (listener: Listener) => {
  listeners.add(listener);
  listener(isVisible);
  return () => {
    listeners.delete(listener);
  };
};
