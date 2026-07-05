import { FC } from "react";

const ThemesList: FC<{ themes: string[] }> = ({ themes }) => {
  return (<>
    <div className='h-full bg-blue-700 flex justify-center items-center'>
      <div className="flex flex-col h-full w-full items-center text-white text-6xl overflow-auto">
        <div className={`w-full text-center`} style={{ bottom: -100 }}>
          {themes.map((theme,index) =>
            <p key={index} className="h-[60px]">{theme}</p>
          )}
        </div>
      </div>
    </div >
  </>)
}

export default ThemesList;