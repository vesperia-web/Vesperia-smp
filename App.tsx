import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { UIProvider } from './context/UIContext';

// Pages
import Home from './pages/Home';
import Wiki from './pages/Wiki';
import Forum from './pages/Forum';
import Rules from './pages/Rules';
import Crafts from './pages/Crafts';
import Gallery from './pages/Gallery';
import NewbieGuide from './pages/guides/NewbieGuide';
import RiftsGuide from './pages/guides/RiftsGuide';
import PluginGuide from './pages/guides/PluginGuide';

const App: React.FC = () => {
  return (
    <UIProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/wiki" element={<Wiki />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/crafts" element={<Crafts />} />
            <Route path="/gallery" element={<Gallery />} />
            
            {/* Sub-Guides */}
            <Route path="/guide/newbie" element={<NewbieGuide />} />
            <Route path="/guide/rifts" element={<RiftsGuide />} />
            <Route path="/guide/plugin" element={<PluginGuide />} />
          </Routes>
        </Layout>
      </HashRouter>
    </UIProvider>
  );
};

export default App;