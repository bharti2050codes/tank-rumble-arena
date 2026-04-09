// Input types
export interface Vec2 {
  x: number;
  y: number;
}

export interface GameInput {
  movement: Vec2; // (-1 to 1 on each axis)
  aimAngle: number; // Angle for turret aiming
  wantsFire: boolean;
  source: "keyboard" | "mouse" | "touch";
}

export interface TouchJoystickState {
  isActive: boolean;
  centerX: number;
  centerY: number;
  currentX: number;
  currentY: number;
  radius: number;
}

export interface TouchAimState {
  isActive: boolean;
  x: number;
  y: number;
}
