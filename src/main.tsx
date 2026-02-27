import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initStore } from './lib/store'
import './index.css'

// Hydrate store from localStorage before first render
initStore()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
