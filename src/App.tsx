import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "@pages/Home";
import Modeling from "@pages/Modeling";
import Rigging from "@pages/Rigging";
import VertexFace from "@pages/VertexFace";
import VertexFace3D from "@pages/VertexFace3D";

const App: React.FC = () => {
  return (
    <Router>
      {/* 라우트 설정 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/modeling" element={<Modeling />} />
        <Route path="/rigging" element={<Rigging />} />
        <Route path="/vertex-face" element={<VertexFace />} />
        <Route path="/vertex-face-3d" element={<VertexFace3D />} />
      </Routes>
    </Router>
  );
};

export default App;
