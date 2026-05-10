import { useState } from 'react'
import CameraFeed from './components/Camera/CameraFeed'
import './App.css'

function App() {
  return (
    <div className="app">
      <main className="app-main">
        <CameraFeed />
      </main>
    </div>
  )
}

export default App

