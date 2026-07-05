import { Results } from "@/components/Results"
import { FC } from "react"

const Test: FC = () => {

  return (<>
    <Results players={[
      {
        id: 'i1',
        name: 'Сергей',
        win: 12,
        lose: 2,
        score: 230,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i2',
        name: 'Вадим',
        win: 22,
        lose: 11,
        score: 490,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i3',
        name: 'Марк',
        win: 12,
        lose: 2,
        score: 200,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i4',
        name: 'Виталик',
        win: 45,
        lose: 1,
        score: 4000,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i5',
        name: 'Альбина',
        win: 12,
        lose: 2,
        score: 400,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i6',
        name: 'Настя',
        win: 12,
        lose: 2,
        score: 3400,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i7',
        name: 'Игорь',
        win: 12,
        lose: 2,
        score: 2444,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i8',
        name: 'Мияги',
        win: 12,
        lose: 2,
        score: 1233,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i9',
        name: 'Аквафина',
        win: 12,
        lose: 2,
        score: 99,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i10',
        name: 'Гоша',
        win: 12,
        lose: 2,
        score: 230,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i11',
        name: 'Зара',
        win: 12,
        lose: 2,
        score: 230,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i12',
        name: 'Андрей',
        win: 12,
        lose: 2,
        score: 230,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i13',
        name: 'Полина',
        win: 12,
        lose: 2,
        score: 230,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i14',
        name: 'Эдик',
        win: 12,
        lose: 2,
        score: 2,
        queue: null,
        keyboardKey: ''
      },
      {
        id: 'i15',
        name: 'Саша',
        win: 12,
        lose: 2,
        score: 230,
        queue: null,
        keyboardKey: ''
      },
    ].slice(0,20)} />
  </>)
}

export default Test

