import { FC } from "react";

const ThemeRound: FC<{ themeName: string }> = ({ themeName }) => {
  return (<>
    <div className='h-screen w-screen bg-blue-700 shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset] border-solid border-2 border-blue-800 border-b-gray-700  flex justify-center items-center'>
      <div className="text-white" style={{
        fontSize: 'calc(1em + 7vw)'
      }}>
        {themeName}
      </div>
    </div >
  </>)
}

export default ThemeRound;