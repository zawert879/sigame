import '../styles/globals.css'
import React, { memo, useEffect } from 'react'
import { ConfigProvider } from 'antd/lib'
import type { AppProps } from 'next/app'

import theme from '../theme/themeConfig'
import { client } from '@/client'
import { KeyPressProvider } from '@/hooks/useKeyPress'
import { SoundProvider } from '@/hooks/useSound'

// eslint-disable-next-line react/display-name
const App = memo(({ Component, pageProps }: AppProps) => {
  // const { updatePlayersFromServer } = usePlayersStore()
  // const { setScore } = useRewardStore()

  useEffect(() => {
    client.handshake()
  }, [])

  return (
    <ConfigProvider theme={theme}>
      <SoundProvider>
        <KeyPressProvider>
          <Component {...pageProps} />
        </KeyPressProvider>
      </SoundProvider>
    </ConfigProvider>
  )
})

export default App