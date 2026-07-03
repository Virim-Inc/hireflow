import type { CSSProperties } from "react";
import "./animated-icon.css";

/** Available CSS animation presets for the icon */
export type IconAnimation =
  | "pulse"
  | "float"
  | "wiggle"
  | "bounce"
  | "spin"
  | "none";

interface AnimatedIconProps {
  /** Image source (imported PNG/GIF from assets) */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Icon size in pixels */
  size?: number;
  /** Animation preset to apply */
  animation?: IconAnimation;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * Reusable animated icon component.
 * Renders Flaticon-style icon images with CSS animation presets.
 * Supports pulse, float, wiggle, bounce, and spin animations.
 */
export function AnimatedIcon({
  src,
  alt,
  size = 24,
  animation = "pulse",
  className = "",
  style,
}: AnimatedIconProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`animated-icon animated-icon--${animation} ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      draggable={false}
    />
  );
}
