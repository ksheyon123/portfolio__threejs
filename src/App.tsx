import React, { useState } from "react";
import ThreeScene from "./components/ThreeScene";
import HumanMeshUsage from "./examples/HumanMeshUsage";
import CameraModelUsage from "./examples/CameraModelUsage";

const App: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>("camera");

  return (
    <div className="min-h-screen">
      <header className="p-4 bg-gray-100">
        <h1 className="text-2xl font-bold">React Three.js 포트폴리오</h1>
      </header>

      <main className="container mx-auto p-4">
        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded ${
                activeExample === "human"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setActiveExample("human")}
            >
              HumanMesh 예제
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeExample === "camera"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setActiveExample("camera")}
            >
              CameraModel 예제
            </button>
          </div>
        </div>

        <div className="card bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl mb-4">
            {activeExample === "human" ? "HumanMesh 예제" : "CameraModel 예제"}
          </h2>
          <p className="mb-4 text-gray-700">
            {activeExample === "human"
              ? "아래는 Three.js를 사용한 HumanMesh 렌더링 예제입니다."
              : "아래는 Three.js를 사용한 CameraModel 예제입니다. Alt 키를 눌러 1인칭/3인칭 시점을 전환해보세요."}
          </p>

          <div className="h-auto border border-gray-200 rounded-lg overflow-hidden">
            {activeExample === "human" ? (
              <HumanMeshUsage />
            ) : (
              <CameraModelUsage />
            )}
          </div>
        </div>
      </main>

      <footer className="text-center p-4 mt-8 bg-gray-100">
        <p>&copy; 2025 React Three.js 포트폴리오</p>
      </footer>
    </div>
  );
};

export default App;
