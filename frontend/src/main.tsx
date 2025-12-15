import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import Home from './components/Home.tsx';
import MultiPagePdfEditor from './components/PdfEditor.tsx';
import Download from './components/Download.tsx';
import './index.css'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='signature/:documentId' element={<MultiPagePdfEditor />} />
        <Route path='download/:documentId' element={<Download />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
