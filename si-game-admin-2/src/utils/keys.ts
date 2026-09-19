const NAMED_KEYS: Record<string, string> = {
  Space: 'Пробел',
  Enter: 'Enter',
  NumpadEnter: 'Num Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Escape: 'Esc',
  CapsLock: 'Caps Lock',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ShiftLeft: 'Shift Л',
  ShiftRight: 'Shift П',
  ControlLeft: 'Ctrl Л',
  ControlRight: 'Ctrl П',
  AltLeft: 'Alt Л',
  AltRight: 'Alt П',
  MetaLeft: 'Cmd Л',
  MetaRight: 'Cmd П',
  ContextMenu: 'Меню',
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
  NumpadEqual: 'Num =',
}

export const keyLabel = (code: string | null | undefined): string => {
  if (!code) {
    return ''
  }
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) {
    return letter[1]
  }
  const digit = /^Digit(\d)$/.exec(code)
  if (digit) {
    return digit[1]
  }
  const numpad = /^Numpad(\d)$/.exec(code)
  if (numpad) {
    return `Num ${numpad[1]}`
  }
  return NAMED_KEYS[code] ?? code
}
