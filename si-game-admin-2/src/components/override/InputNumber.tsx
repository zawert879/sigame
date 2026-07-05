import { useKeyPress } from "@/hooks/useKeyPress";
import {InputNumber as InputNumberAnt} from "antd/lib";
import React, { useCallback } from "react";

export const InputNumber: React.FC<React.ComponentProps<typeof InputNumberAnt>> = (props) => {
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
    <InputNumberAnt {...props} onBlur={onBlur} onFocus={onFocus} />
  )
}

