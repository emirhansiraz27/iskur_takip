import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Uygulama from './Uygulama.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Uygulama />
  </StrictMode>,
)
