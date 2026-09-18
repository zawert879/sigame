import '../styles/globals.css'
import React, { memo } from 'react'
import { ConfigProvider } from 'antd'
import type { AppProps } from 'next/app'

import theme from '../theme/themeConfig'
import { KeyPressProvider } from '@/hooks/useKeyPress'
import { SoundProvider } from '@/hooks/useSound'
import { MessageHolder } from '@/utils/notify'

// eslint-disable-next-line react/display-name
const App = memo(({ Component, pageProps }: AppProps) => {
  return (
    <ConfigProvider theme={theme}>
      <MessageHolder />
      <SoundProvider>
        <KeyPressProvider>
          <Component {...pageProps} />
        </KeyPressProvider>
      </SoundProvider>
    </ConfigProvider>
  )
})

export default App
