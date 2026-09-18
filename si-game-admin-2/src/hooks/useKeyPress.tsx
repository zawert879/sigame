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

// Modifier keys pressed on their own: a player's button may be one of them (e.g. left / right Ctrl for two players
// sharing a keyboard). Their own keydown already reports the modifier as held (Control → ctrlKey, AltGr → ctrlKey + altKey).
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Super', 'Hyper', 'Shift'])

// A Ctrl / Cmd / Alt combination with another key, e.g. Ctrl+R.
const isShortcut = (e: globalThis.KeyboardEvent): boolean =>
    (e.ctrlKey || e.metaKey || e.altKey) && !MODIFIER_KEYS.has(e.key)

// Player buttons: every key press on the page is sent to the server, which matches it with a player by `code`.
// Typing into form fields, auto-repeat and shortcuts are not button presses; a modifier key alone is.
export const KeyPressProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [isEnable, setIsEnable] = useState<boolean>(true)
    const isEnableRef = useRef(isEnable)

    useEffect(() => {
        isEnableRef.current = isEnable
    }, [isEnable])

    useEffect(() => {
        const keyDownHandler = (e: globalThis.KeyboardEvent) => {
            if (!isEnableRef.current || e.repeat || isShortcut(e) || isEditableTarget(e.target)) {
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
