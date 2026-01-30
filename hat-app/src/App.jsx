import { useState } from 'react'
import CameraFeed from './components/Camera/CameraFeed'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AR Hat App</h1>
        <p className="subtitle">Face tracking + AR overlay</p>
      </header>
      <main className="app-main">
        <CameraFeed />
      </main>
    </div>
  )
}

export default App

