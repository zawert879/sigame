import { ChangeEvent, CSSProperties, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input as AntInput } from "antd";
import { Input } from "../override/Input";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { isNextKey, useKeyPress } from "@/hooks/useKeyPress";
import { keyLabel } from "@/utils/keys";
import { notifyErrorText } from "@/utils/notify";

const NAME_ROWS = { minRows: 1, maxRows: 3 }
const KEY_MIN_WIDTH = "3.5rem"
const KEY_EMPTY_LABEL = "Кнопка"

const singleLine = (value: string): string => value.replace(/\s*[\r\n]+\s*/g, ' ')

const keyFieldStyle = (label: string): CSSProperties => ({
  width: `max(${KEY_MIN_WIDTH}, calc(${Math.max(1, label.length)}ch + 1.75rem))`,
})

export const PlayerNameInput: FC<{
  name: string;
  onSave: (name: string) => unknown;
  className?: string;
}> = ({ name, onSave, className }) => {
  const [value, setValue] = useState(name)
  const focused = useRef(false)
  const { setIsEnable } = useKeyPress()
  const save = useDebouncedCallback(onSave, 450)

  useEffect(() => {
    if (!focused.current) {
      setValue(name)
    }
  }, [name])

  const onChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = singleLine(event.target.value)
    setValue(next)
    save(next)
  }, [save])
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }, [])
  const onFocus = useCallback(() => {
    focused.current = true
    setIsEnable(false)
  }, [setIsEnable])
  const onBlur = useCallback(() => {
    focused.current = false
    setIsEnable(true)
  }, [setIsEnable])

  return (
    <AntInput.TextArea
      className={`!resize-none ${className ?? ""}`}
      rows={1}
      autoSize={NAME_ROWS}
      placeholder="Имя"
      aria-label="Имя игрока"
      title={value || undefined}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  )
}

export const PlayerKeyInput: FC<{
  code: string;
  onChange: (code: string) => unknown;
  className?: string;
}> = ({ code, onChange, className }) => {
  const label = keyLabel(code)
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      return
    }
    event.preventDefault()
    if (isNextKey(event.code, event.key)) {
      notifyErrorText('Page Down нельзя назначить игроку: этой клавишей ведущий переходит дальше')
      return
    }
    void onChange(event.code)
  }, [onChange])

  return (
    <Input
      className={`shrink-0 !px-2 text-center ${className ?? ""}`}
      style={keyFieldStyle(label || KEY_EMPTY_LABEL)}
      placeholder={KEY_EMPTY_LABEL}
      aria-label="Кнопка игрока"
      title={code ? `Кнопка: ${label} (${code}). Нажмите другую клавишу, чтобы сменить` : 'Нажмите клавишу игрока'}
      value={label}
      onKeyDown={onKeyDown}
      readOnly
    />
  )
}
