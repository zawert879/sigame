import { useKeyPress } from "@/hooks/useKeyPress";
import {Input as InputAnt, InputProps} from "antd/lib";
import React, { useCallback } from "react";

export const Input: React.FC<InputProps> = (props) => {
  const keyPress = useKeyPress()
  const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement, Element>) => {
    keyPress.setIsEnable(true)
    if (props.onBlur) {
      return props.onBlur(e)
    }
  }, [keyPress, props])

  const onFocus = useCallback((e: React.FocusEvent<HTMLInputElement, Element>) => {
    keyPress.setIsEnable(false)

    if (props.onFocus) {
      return props.onFocus(e)
    }
  }, [keyPress, props])

  return (
    <InputAnt {...props} onBlur={onBlur} onFocus={onFocus} />
  )
}

