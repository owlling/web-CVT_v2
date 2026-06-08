import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import Home from '@/pages/Home';
import ImagePage from '@/pages/ImagePage';
import VideoPage from '@/pages/VideoPage';
import ColorPage from '@/pages/ColorPage';
import ContrastPage from '@/pages/ContrastPage';
import GamesPage from '@/pages/GamesPage';
import IshiharaPage from '@/pages/IshiharaPage';
import ColorDiffPage from '@/pages/ColorDiffPage';
import MosaicPage from '@/pages/MosaicPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="image" element={<ImagePage />} />
          <Route path="video" element={<VideoPage />} />
          <Route path="color" element={<ColorPage />} />
          <Route path="contrast" element={<ContrastPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/ishihara" element={<IshiharaPage />} />
          <Route path="games/color-diff" element={<ColorDiffPage />} />
          <Route path="games/mosaic" element={<MosaicPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
