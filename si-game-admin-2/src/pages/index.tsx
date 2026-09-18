import React from 'react'
import { FirstGameRedirect } from '@/components/screens/FirstGameRedirect'

// "/" opens the player screen of the first game (the startup link for the players' screen points here).
const Home = () => <FirstGameRedirect route="player" />

export default Home
