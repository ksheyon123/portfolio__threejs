import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import App from "./App";

// Home은 마운트 시 WebGL 컨텍스트를 생성하므로 jsdom 환경에서는 모의 처리합니다.
vi.mock("@pages/Home", () => ({
  default: () => <div data-testid="home-page" />,
}));

vi.mock("@pages/Modeling", () => ({
  default: () => <div data-testid="modeling-page" />,
}));

describe("App 컴포넌트", () => {
  test("기본 경로('/')에서 Home 페이지가 렌더링된다", () => {
    render(<App />);
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  test("기본 경로에서 Modeling 페이지는 렌더링되지 않는다", () => {
    render(<App />);
    expect(screen.queryByTestId("modeling-page")).not.toBeInTheDocument();
  });
});
