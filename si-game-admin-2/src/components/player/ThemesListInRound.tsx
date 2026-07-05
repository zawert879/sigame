import { FC, useState } from "react";

const ThemesListInRound: FC<{ themes: string[] }> = ({ themes }) => {
  const [themeIndex, setThemeIndex] = useState(0)

  const onAnimationEnd = () => {
    if(themeIndex <= themes.length -1 ){
      setThemeIndex(themeIndex + 1)
    }else{
      console.log('onAnimationEnd')
    }
  };

  return (<>
    <div className='h-screen w-screen bg-blue-700 shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset] border-solid border-2 border-blue-800 border-b-gray-700 flex justify-center items-center'>
      <div className="text-white text-[0px] animate-themePulse"
        onAnimationIteration={onAnimationEnd}
      >
        {themes[themeIndex]}
      </div>
    </div >
  </>)
}

export default ThemesListInRound;