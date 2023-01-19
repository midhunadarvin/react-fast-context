import React, {
  useSyncExternalStore,
  createContext,
  useContext,
  useRef,
  useCallback,
} from "react";

/**
 * CreateFastContext - This function wraps a react context in publisher-subscriber model
 * so that it can be subscribed from components and changes in the store only re-renders 
 * those components. 
 * 
 * @param initialState Initial state of the store
 * @returns 
 */

export default function createFastContext<Store>(initialState: Store) {

  /**
   * Custom hook for creating store, getter, setter and subscribe functionality 
   */
  function useStoreData(): {
    get: () => Store;
    set: (value: Partial<Store>) => void;
    subscribe: (callback: () => void) => () => void;
  } {
    const store = useRef(initialState); 
    // ref for storing the subscribers
    const subscribers = useRef(new Set<() => void>()); 

    const get = useCallback(() => store.current, []);

    const set = useCallback((value: Partial<Store>) => {
      store.current = { ...store.current, ...value };

      // whenever the store is set, for each of the subscribers invoke the subscribed callback
      subscribers.current.forEach((subscriber) => subscriber());
    }, []);

    const subscribe = useCallback((callback: () => void) => {
      subscribers.current.add(callback);
      // returns the unsubscribe function
      return () => subscribers.current.delete(callback);
    }, []);

    return {
      get,
      set,
      subscribe,
    };
  }

  type UseStoreDataReturnType = ReturnType<typeof useStoreData>;
  const StoreContext = createContext<UseStoreDataReturnType | null>(null);

  /**
   * Helper function to wrap components with Provider, so that they have
   * access to the react context ( StoreContext ). As StoreContext doesn't
   * change, it doesn't cause re-renders for the underlying components.
   */
  const Provider = ({ children }: { children: React.ReactNode }) => {
    const store = useStoreData();
    return (
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    );
  };

  /**
   * Custom hook for use within components, so that they are subscribed 
   * to the changes in the store and can be re-rendered.
   */
  function useStore<SelectorOutput>(
    selector: (store: Store) => SelectorOutput
  ): [SelectorOutput, (value: Partial<Store>) => void] {

    const store = useContext(StoreContext);
    if (!store) {
      throw new Error("Store not found!");
    }

    // This function subscribes to the external store and re-renders the 
    // component if there is a change in the external store.
    const state = useSyncExternalStore(store.subscribe, () =>
      selector(store.get())
    );

    return [state, store.set];
  }

  return {
    Provider,
    useStore
  }
}
