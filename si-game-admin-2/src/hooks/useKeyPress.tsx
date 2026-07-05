'use client';

import { client } from '@/client';
import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import type { PropsWithChildren } from 'react';

type SetIsEnable = React.Dispatch<React.SetStateAction<boolean>>

type ContextType = [boolean, SetIsEnable, string]

const KeyPressContext = React.createContext<ContextType | null>(null);

export const KeyPressProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [isEnable, setIsEnable] = useState<boolean>(true)
    const [key, setKey] = useState<string>('')

    const keyDownHandler = useCallback((e: globalThis.KeyboardEvent) => {
        if (isEnable) {
            setKey(e.key)
            console.log('keyDownHandler', e)
            client.keyPress(e.key, e.code)
        }
    }, [isEnable])

    useEffect(() => {
        document.addEventListener("keydown", keyDownHandler);
        return () => {
            document.removeEventListener("keydown", keyDownHandler);
        }
    }, [keyDownHandler])

    const context = useMemo<ContextType>(() => ([
        isEnable,
        setIsEnable,
        key
    ]), [isEnable, key]);

    return <KeyPressContext.Provider value={context}>{children}</KeyPressContext.Provider>;
};

export const useKeyPress = () => {
    const [isEnable, setIsEnable, key] = useContext(KeyPressContext)!

    return {
        isEnable, setIsEnable, key
    }
}