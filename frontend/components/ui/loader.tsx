import React from "react";

interface SvgLoaderProps {
  size?: number | string; // Default: 48
  color?: string;         // Default: "#4f46e5" (Indigo-600)
  className?: string;
}

const SvgLoader: React.FC<SvgLoaderProps> = ({
  size = 48,
  color = "#4f46e5",
  className = "",
}) => {
  const actualSize = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: actualSize, height: actualSize }}
    >
      <svg
        className="animate-spin"
        viewBox="0 0 50 50"
        width="100%"
        height="100%"
        fill="none"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="90"
          strokeDashoffset="60"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke={`${color}33`} // transparent 20%
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="100"
        />
      </svg>
    </div>
  );
};

export default SvgLoader;
