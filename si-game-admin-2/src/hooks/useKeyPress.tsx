'use client';

import { client } from '@/client';
import React, {
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type { PropsWithChildren } from 'react';

type SetIsEnable = React.Dispatch<React.SetStateAction<boolean>>

type ContextType = [boolean, SetIsEnable]

const KeyPressContext = React.createContext<ContextType | null>(null);

const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
        return false
    }
    const tagName = target.tagName
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable
}

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Super', 'Hyper', 'Shift'])

export const NO_BUZZER_ATTRIBUTE = 'data-no-buzzer'

const ACTIVATION_KEYS = new Set(['Enter', ' '])

const activatesControl = (e: globalThis.KeyboardEvent): boolean =>
    ACTIVATION_KEYS.has(e.key) && e.target instanceof Element && e.target.closest(`[${NO_BUZZER_ATTRIBUTE}]`) !== null

const isShortcut = (e: globalThis.KeyboardEvent): boolean =>
    (e.ctrlKey || e.metaKey || e.altKey) && !MODIFIER_KEYS.has(e.key)

export const KeyPressProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [isEnable, setIsEnable] = useState<boolean>(true)
    const isEnableRef = useRef(isEnable)

    useEffect(() => {
        isEnableRef.current = isEnable
    }, [isEnable])

    useEffect(() => {
        const keyDownHandler = (e: globalThis.KeyboardEvent) => {
            if (!isEnableRef.current || e.repeat || isShortcut(e) || isEditableTarget(e.target) || activatesControl(e)) {
                return
            }
            client.keyPress(e.key, e.code)
        }
        document.addEventListener("keydown", keyDownHandler);
        return () => {
            document.removeEventListener("keydown", keyDownHandler);
        }
    }, [])

    const context = useMemo<ContextType>(() => ([
        isEnable,
        setIsEnable,
    ]), [isEnable]);

    return <KeyPressContext.Provider value={context}>{children}</KeyPressContext.Provider>;
};

export const useKeyPress = () => {
    const [isEnable, setIsEnable] = useContext(KeyPressContext)!

    return {
        isEnable, setIsEnable
    }
}
