'use client';

import { client } from '@/client';
import React, {
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import type { PropsWithChildren } from 'react';
import * as useSoundLib from 'use-sound';


export enum SoundType {
    FinalDelete = 'FinalDelete',
    FinalThink = 'FinalThink',
    GameBegin = 'GameBegin',
    QuestionNoanswers = 'QuestionNoanswers',
    QuestionNorisk = 'QuestionNorisk',
    QuestionSecret = 'QuestionSecret',
    QuestionStake = 'QuestionStake',
    RoundBegin = 'RoundBegin',
    RoundThemes = 'RoundThemes',
    RoundTimeout = 'RoundTimeout',
}

type PlaySound = (soundType: SoundType) => void

type ContextType = [PlaySound]

const SoundContext = React.createContext<ContextType | null>(null);

// eslint-disable-next-line react/display-name
export const SoundProvider: React.FC<PropsWithChildren> = memo(({ children }) => {

    const [playFinalDelete] = useSoundLib.useSound('/MUSIC/final_delete.mp3')
    const [playFinalThink] = useSoundLib.useSound('/MUSIC/final_think.mp3')
    const [playGameBegin] = useSoundLib.useSound('/MUSIC/game_begin.mp3')
    const [playQuestionNoanswers] = useSoundLib.useSound('/MUSIC/question_noanswers.mp3')
    const [playQuestionNorisk] = useSoundLib.useSound('/MUSIC/question_norisk.mp3')
    const [playQuestionSecret] = useSoundLib.useSound('/MUSIC/question_secret.mp3')
    const [playQuestionStake] = useSoundLib.useSound('/MUSIC/question_stake.mp3')
    const [playRoundBegin] = useSoundLib.useSound('/MUSIC/round_begin.mp3')
    const [playRoundThemes] = useSoundLib.useSound('/MUSIC/round_themes.mp3')
    const [playRoundTimeout] = useSoundLib.useSound('/MUSIC/round_timeout.mp3')


    const playSound = useCallback((soundType: SoundType): void => {
        switch (soundType) {
            case SoundType.FinalDelete:
                playFinalDelete()
                break;
            case SoundType.FinalThink:
                playFinalThink()
                break;
            case SoundType.GameBegin:
                playGameBegin()
                break;
            case SoundType.QuestionNoanswers:
                playQuestionNoanswers()
                break;
            case SoundType.QuestionNorisk:
                playQuestionNorisk()
                break;
            case SoundType.QuestionSecret:
                playQuestionSecret()
                break;
            case SoundType.QuestionStake:
                playQuestionStake()
                break;
            case SoundType.RoundBegin:
                playRoundBegin()
                break;
            case SoundType.RoundThemes:
                playRoundThemes()
                break;
            case SoundType.RoundTimeout:
                playRoundTimeout()
                break;
        }
    }, [playFinalDelete, playFinalThink, playGameBegin, playQuestionNoanswers, playQuestionNorisk, playQuestionSecret, playQuestionStake, playRoundBegin, playRoundThemes, playRoundTimeout])

    const context = useMemo<ContextType>(() => ([
        playSound,
    ]), [playSound]);

    return <SoundContext.Provider value={context}>{children}</SoundContext.Provider>;
});

export const useSound = () => {
    const [playSound] = useContext(SoundContext)!

    return {
        playSound
    }
}