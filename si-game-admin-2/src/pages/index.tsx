import React, { memo, useEffect, useMemo, useState } from 'react'
import { Button, Layout, Space } from 'antd/lib'
import { useRouter } from 'next/navigation'
import { ResponseGetGames } from '@/types'
import { client } from '@/client'

const { Content } = Layout

// eslint-disable-next-line react/display-name
const Home = memo(() => {
  const router = useRouter()

  useEffect(() => {
    const fetchGames = async () => {
      
      const games = await client.getGames()
      if (games.length > 0) {
        router.push(`/player/${games[0].gameId}`)
      }
    }
    
    fetchGames()
  }, [router])

  return (
    <div className="bg-blue-700 h-[92vh] lg:h-[100vh] flex flex-col justify-center items-center w-screen">
    </div>
  )
})

export default Home