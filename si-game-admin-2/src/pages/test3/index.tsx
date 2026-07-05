// Файл, где у вас был компонент Test (например, src/app/test/page.tsx)

"use client";
import { FC } from "react";
import dynamic from 'next/dynamic';
import { MediaPlayerType } from "@/components/MediaPlayer";

// Динамически импортируем наш плеер и отключаем для него SSR
const MediaPlayer = dynamic(() => import('@/components/MediaPlayer'), {
  ssr: false,
});

const Test: FC = () => {
  return (
    <>
      {/* Теперь просто рендерим компонент, который загрузится только на клиенте */}
      <MediaPlayer  url="https://stream.mux.com/maVbJv2GSYNRgS02kPXOOGdJMWGU1mkA019ZUjYE7VU7k" type={MediaPlayerType.Admin}/>
    </>
  );
};

export default Test;
