import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initStore } from './lib/store'
import './index.css'

// Hydrate store from IndexedDB before first render
const root = ReactDOM.createRoot(document.getElementById('root')!)

initStore()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch((err) => {
    console.error('Failed to initialize store:', err)
    // Render anyway so the user gets a UI rather than a blank screen.
    // The store will be empty but functional (data will not be persisted).
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
