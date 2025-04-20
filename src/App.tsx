import React from "react";
import ThreeScene from "./components/ThreeScene";
import HumanMeshUsage from "./examples/HumanMeshUsage";

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <header>
        <h1 className="text-2xl font-bold">React Three.js 포트폴리오</h1>
      </header>

      <main className="container">
        <div className="card">
          <h2 className="text-xl mb-4">3D 렌더링 예제</h2>
          <p className="mb-4 text-gray-700">
            아래는 Three.js를 사용한 간단한 3D 큐브 렌더링 예제입니다.
          </p>

          <div className="h-auto border border-gray-200 rounded-lg overflow-hidden">
            <HumanMeshUsage />
          </div>
        </div>
      </main>

      <footer className="text-center">
        <p>&copy; 2025 React Three.js 포트폴리오</p>
      </footer>
    </div>
  );
};

export default App;
