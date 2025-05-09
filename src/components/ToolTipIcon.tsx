import React, { useState } from "react";
import {
  FiInfo,
  FiAlertTriangle,
  FiXCircle,
  FiHelpCircle,
} from "react-icons/fi";

interface ToolTipIconProps {
  /**
   * 툴팁에 표시할 텍스트
   */
  text: string;
  /**
   * 아이콘 종류 (기본값: 'info')
   */
  iconType?: "info" | "warning" | "error" | "question";
  /**
   * 아이콘 크기 (기본값: 'md')
   */
  size?: "sm" | "md" | "lg";
  /**
   * 툴팁 위치 (기본값: 'top')
   * top: 상단 중앙, top-left: 좌상단, top-right: 우상단
   * right: 우측 중앙, right-top: 우상단, right-bottom: 우하단
   * bottom: 하단 중앙, bottom-left: 좌하단, bottom-right: 우하단
   * left: 좌측 중앙, left-top: 좌상단, left-bottom: 좌하단
   */
  position?:
    | "top"
    | "top-left"
    | "top-right"
    | "right"
    | "right-top"
    | "right-bottom"
    | "bottom"
    | "bottom-left"
    | "bottom-right"
    | "left"
    | "left-top"
    | "left-bottom";
  /**
   * 추가 CSS 클래스
   */
  className?: string;
}

/**
 * 마우스 호버 시 툴팁을 표시하는 아이콘 컴포넌트
 */
const ToolTipIcon: React.FC<ToolTipIconProps> = ({
  text,
  iconType = "info",
  size = "md",
  position = "top",
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // 아이콘 타입에 따른 아이콘 컴포넌트 및 색상 설정
  const getIconConfig = () => {
    switch (iconType) {
      case "info":
        return {
          icon: FiInfo,
          color: "text-blue-500",
        };
      case "warning":
        return {
          icon: FiAlertTriangle,
          color: "text-yellow-500",
        };
      case "error":
        return {
          icon: FiXCircle,
          color: "text-red-500",
        };
      case "question":
        return {
          icon: FiHelpCircle,
          color: "text-purple-500",
        };
      default:
        return {
          icon: FiInfo,
          color: "text-blue-500",
        };
    }
  };

  // 아이콘 크기에 따른 클래스 설정
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "w-4 h-4";
      case "lg":
        return "w-6 h-6";
      case "md":
      default:
        return "w-5 h-5";
    }
  };

  // 툴팁 위치에 따른 클래스 설정
  const getPositionClass = () => {
    switch (position) {
      // 우측 위치들
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "right-top":
        return "left-full ml-2 top-0";
      case "right-bottom":
        return "left-full ml-2 bottom-0";

      // 하단 위치들
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "bottom-left":
        return "top-full mt-2 left-0";
      case "bottom-right":
        return "top-full mt-2 right-0";

      // 좌측 위치들
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "left-top":
        return "right-full mr-2 top-0";
      case "left-bottom":
        return "right-full mr-2 bottom-0";

      // 상단 위치들
      case "top-left":
        return "bottom-full mb-2 left-0";
      case "top-right":
        return "bottom-full mb-2 right-0";
      case "top":
      default:
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
    }
  };

  const { icon: IconComponent, color } = getIconConfig();
  const sizeClass = getSizeClass();
  const positionClass = getPositionClass();

  return (
    <div
      className={`inline-flex relative ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <IconComponent
        className={`${sizeClass} ${color} cursor-pointer stroke-2`}
        aria-hidden="true"
      />

      {isVisible && (
        <div
          className={`absolute z-[9999] px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg opacity-100 tooltip dark:bg-gray-700 ${positionClass} w-[400px] whitespace-normal`}
          role="tooltip"
        >
          {text}
          <div
            className={`tooltip-arrow ${
              // 상단 위치들
              position === "top"
                ? "bottom-0 left-1/2 -translate-x-1/2 border-t-gray-900"
                : position === "top-left"
                ? "bottom-0 left-[10px] border-t-gray-900"
                : position === "top-right"
                ? "bottom-0 right-[10px] border-t-gray-900"
                : // 우측 위치들
                position === "right"
                ? "left-0 top-1/2 -translate-y-1/2 border-r-gray-900"
                : position === "right-top"
                ? "left-0 top-[10px] border-r-gray-900"
                : position === "right-bottom"
                ? "left-0 bottom-[10px] border-r-gray-900"
                : // 하단 위치들
                position === "bottom"
                ? "top-0 left-1/2 -translate-x-1/2 border-b-gray-900"
                : position === "bottom-left"
                ? "top-0 left-[10px] border-b-gray-900"
                : position === "bottom-right"
                ? "top-0 right-[10px] border-b-gray-900"
                : // 좌측 위치들
                position === "left"
                ? "right-0 top-1/2 -translate-y-1/2 border-l-gray-900"
                : position === "left-top"
                ? "right-0 top-[10px] border-l-gray-900"
                : position === "left-bottom"
                ? "right-0 bottom-[10px] border-l-gray-900"
                : "bottom-0 left-1/2 -translate-x-1/2 border-t-gray-900" // 기본값
            }`}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ToolTipIcon;
