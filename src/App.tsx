import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "@pages/Home";
import Modeling from "@pages/Modeling";

const App: React.FC = () => {
  return (
    <Router>
      {/* 라우트 설정 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/modeling" element={<Modeling />} />
      </Routes>
    </Router>
  );
};

export default App;
