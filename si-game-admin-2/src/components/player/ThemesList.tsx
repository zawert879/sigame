import { FC, useEffect, useState } from "react";

const ThemesList: FC<{ themes: string[] }> = ({ themes }) => {
  const [pos, setPos] = useState(10000)
  const [isRun, setIsRun] = useState(true)

  useEffect(() => {
    setPos(window.innerHeight)
  }, [])

  useEffect(() => {
    if (isRun) {
      setTimeout(() => {
        setPos(pos - 1)
        if (pos < -(themes.length * 60)) {
          setIsRun(false)
        }
      }, 10)
    }
  }, [pos, isRun, themes.length])

  return (<>
    <div className='h-screen bg-blue-700 shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset] border-solid border-2 border-blue-800 border-b-gray-700  flex justify-center items-center'>
      <div className="flex flex-col h-screen w-full text-white text-6xl  overflow-hidden relative">
        <div className={`w-full text-center absolute`} style={{ bottom: pos }}>
          {themes.map((theme,index) =>
            <p key={index} className="h-[60px]">{theme}</p>
          )}
        </div>
      </div>
    </div >
  </>)
}

export default ThemesList;