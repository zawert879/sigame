import { FC } from "react";

const ThemeRound: FC<{ themeName: string }> = ({ themeName }) => {
  return (<>
    <div className='h-full w-full bg-blue-700 flex justify-center items-center'>
      <div className="text-white text-[200px]">
        {themeName}
      </div>
    </div >
  </>)
}

export default ThemeRound;