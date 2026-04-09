import React, { useEffect, useRef } from "react";
import { TouchJoystickState, TouchAimState } from "./types";

interface VirtualJoystickProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  joystickState: TouchJoystickState;
  aimState: TouchAimState;
}

export const VirtualJoystick = React.memo(
  ({ canvasRef, joystickState, aimState }: VirtualJoystickProps) => {
    const overlayRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const mainCanvas = canvasRef.current;
      if (!mainCanvas) return;

      // Mirror main canvas dimensions
      overlay.width = mainCanvas.width;
      overlay.height = mainCanvas.height;

      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      // Clear overlay
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      // Draw joystick (left side)
      if (joystickState.isActive) {
        const radius = joystickState.radius;
        const centerX = joystickState.centerX;
        const centerY = joystickState.centerY;
        const currentX = joystickState.currentX;
        const currentY = joystickState.currentY;

        // Background circle
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Joystick border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Joystick thumb
        const thumbRadius = radius * 0.4;
        ctx.fillStyle = "rgba(100, 200, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(currentX, currentY, thumbRadius, 0, Math.PI * 2);
        ctx.fill();

        // Thumb border
        ctx.strokeStyle = "rgba(100, 200, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(currentX, currentY, thumbRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Direction indicator lines
        ctx.strokeStyle = "rgba(100, 200, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      }

      // Draw fire zone (right side)
      if (aimState.isActive) {
        const fireRadius = 35;
        const aimX = aimState.x;
        const aimY = aimState.y;

        // Fire zone background
        ctx.fillStyle = "rgba(255, 100, 100, 0.1)";
        ctx.beginPath();
        ctx.arc(aimX, aimY, fireRadius, 0, Math.PI * 2);
        ctx.fill();

        // Fire zone border
        ctx.strokeStyle = "rgba(255, 100, 100, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aimX, aimY, fireRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = "rgba(255, 100, 100, 0.8)";
        ctx.beginPath();
        ctx.arc(aimX, aimY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw control hints (only when not active)
      if (!joystickState.isActive && !aimState.isActive) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.font = "12px monospace";
        ctx.textAlign = "left";
        ctx.fillText("Left: Move", 10, 25);

        ctx.textAlign = "right";
        ctx.fillText("Right: Aim & Fire", overlay.width - 10, 25);
      }
    });

    return (
      <canvas
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair touch-none"
        style={{ display: "block" }}
      />
    );
  }
);

VirtualJoystick.displayName = "VirtualJoystick";
