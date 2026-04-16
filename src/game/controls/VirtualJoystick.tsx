import React, { useEffect, useRef } from "react";
import { TouchJoystickState, TouchAimState } from "./types";

interface VirtualJoystickProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  joystickState: TouchJoystickState;
  aimState: TouchAimState;
}

const JOYSTICK_SIZE = 120; // Diameter of the joystick

export const VirtualJoystick = React.memo(
  ({ canvasRef, joystickState, aimState }: VirtualJoystickProps) => {
    const overlayRef = useRef<HTMLCanvasElement>(null);

    // Draw the fixed joystick at bottom-left of canvas
    useEffect(() => {
      const overlay = overlayRef.current;
      if (!overlay) {
        console.log("[VirtualJoystick] No overlay ref");
        return;
      }

      const mainCanvas = canvasRef.current;
      if (!mainCanvas) {
        console.log("[VirtualJoystick] No main canvas ref");
        return;
      }

      console.log("[VirtualJoystick] Drawing joystick", {
        mainCanvasWidth: mainCanvas.width,
        mainCanvasHeight: mainCanvas.height,
      });

      // Mirror main canvas dimensions
      overlay.width = mainCanvas.width;
      overlay.height = mainCanvas.height;

      const ctx = overlay.getContext("2d");
      if (!ctx) {
        console.log("[VirtualJoystick] Could not get 2D context");
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      // Joystick position (bottom-left)
      const margin = 15;
      const joystickRadius = JOYSTICK_SIZE / 2 - 5;
      const centerX = margin + joystickRadius + 5;
      const centerY = overlay.height - margin - joystickRadius - 5;

      // Background circle
      ctx.fillStyle = "rgba(100, 200, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, joystickRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(100, 200, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, joystickRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Thumb - show current joystick position
      if (joystickState.isActive) {
        const thumbRadius = joystickRadius * 0.35;

        // Calculate relative position within this fixed joystick
        const relX = joystickState.currentX - joystickState.centerX;
        const relY = joystickState.currentY - joystickState.centerY;
        const dist = Math.hypot(relX, relY);
        const maxDist = Math.min(dist, joystickRadius * 0.7);

        const thumbX = centerX + (relX / (dist || 1)) * maxDist;
        const thumbY = centerY + (relY / (dist || 1)) * maxDist;

        // Thumb fill
        ctx.fillStyle = "rgba(100, 200, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbRadius, 0, Math.PI * 2);
        ctx.fill();

        // Thumb border
        ctx.strokeStyle = "rgba(150, 220, 255, 1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Line from center to thumb
        ctx.strokeStyle = "rgba(100, 200, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(thumbX, thumbY);
        ctx.stroke();
      } else {
        // Center dot when inactive
        ctx.fillStyle = "rgba(100, 200, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw fire hint on right side
      ctx.fillStyle = "rgba(255, 100, 100, 0.1)";
      const fireHintRadius = 40;
      const fireHintX = overlay.width - 40 - fireHintRadius;
      const fireHintY = overlay.height - 40 - fireHintRadius;
      ctx.beginPath();
      ctx.arc(fireHintX, fireHintY, fireHintRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 100, 100, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(fireHintX, fireHintY, fireHintRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 100, 100, 0.4)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TAP TO", fireHintX, fireHintY - 6);
      ctx.fillText("FIRE", fireHintX, fireHintY + 6);
    }, [joystickState, canvasRef]);

    return (
      <canvas
        ref={overlayRef}
        className="absolute inset-0 touch-none pointer-events-none"
        style={{ display: "block" }}
      />
    );
  }
);

VirtualJoystick.displayName = "VirtualJoystick";
