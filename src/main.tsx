import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initStore } from './lib/store'
import './index.css'

// Hydrate store from IndexedDB before first render
initStore().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
