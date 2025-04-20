import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

// ThreeScene 컴포넌트를 모의(mock)하여 테스트를 단순화합니다.
jest.mock("./components/ThreeScene", () => () => (
  <div data-testid="three-scene" />
));

describe("App 컴포넌트", () => {
  test("헤더가 렌더링되는지 확인", () => {
    render(<App />);
    const headerElement = screen.getByText(/React Three.js 포트폴리오/i);
    expect(headerElement).toBeInTheDocument();
  });

  test("3D 렌더링 예제 섹션이 존재하는지 확인", () => {
    render(<App />);
    const sectionTitle = screen.getByText(/3D 렌더링 예제/i);
    expect(sectionTitle).toBeInTheDocument();
  });

  test("ThreeScene 컴포넌트가 렌더링되는지 확인", () => {
    render(<App />);
    const threeSceneElement = screen.getByTestId("three-scene");
    expect(threeSceneElement).toBeInTheDocument();
  });
});
