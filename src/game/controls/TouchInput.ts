import { GameInput, Vec2, TouchJoystickState, TouchAimState } from "./types";

const angleTo = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

const JOYSTICK_RADIUS = 50;
const JOYSTICK_DEAD_ZONE = 10;
const TOUCH_ZONE_LEFT = 0.4; // Left 40% is joystick

export class TouchInput {
  private joystickState: TouchJoystickState = {
    isActive: false,
    centerX: 0,
    centerY: 0,
    currentX: 0,
    currentY: 0,
    radius: JOYSTICK_RADIUS,
  };

  private aimState: TouchAimState = {
    isActive: false,
    x: 0,
    y: 0,
  };

  private playerInteracted = false;

  constructor() {}

  onTouchStart(e: TouchEvent, canvas: HTMLCanvasElement) {
    this.playerInteracted = true;
    const r = canvas.getBoundingClientRect();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = (touch.clientX - r.left) * (canvasWidth / r.width);
      const y = (touch.clientY - r.top) * (canvasHeight / r.height);

      // Determine which zone: left is joystick, right is aim/fire
      const zone = x < canvasWidth * TOUCH_ZONE_LEFT ? "left" : "right";

      if (zone === "left" && !this.joystickState.isActive) {
        this.joystickState.isActive = true;
        this.joystickState.centerX = x;
        this.joystickState.centerY = y;
        this.joystickState.currentX = x;
        this.joystickState.currentY = y;
      } else if (zone === "right" && !this.aimState.isActive) {
        this.aimState.isActive = true;
        this.aimState.x = x;
        this.aimState.y = y;
      }
    }
  }

  onTouchMove(e: TouchEvent, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = (touch.clientX - r.left) * (canvasWidth / r.width);
      const y = (touch.clientY - r.top) * (canvasHeight / r.height);

      // Update joystick position
      if (this.joystickState.isActive) {
        this.joystickState.currentX = x;
        this.joystickState.currentY = y;
      }

      // Update aim position
      if (this.aimState.isActive) {
        this.aimState.x = x;
        this.aimState.y = y;
      }
    }
  }

  onTouchEnd(e: TouchEvent) {
    // Check if touches remain
    if (e.touches.length === 0) {
      this.joystickState.isActive = false;
      this.aimState.isActive = false;
    } else {
      // Deactivate specific zones based on remaining touches
      const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const canvasWidth = (e.target as HTMLCanvasElement).width;

      let hasLeftTouch = false,
        hasRightTouch = false;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = (touch.clientX - r.left) * (canvasWidth / r.width);
        if (x < canvasWidth * TOUCH_ZONE_LEFT) {
          hasLeftTouch = true;
        } else {
          hasRightTouch = true;
        }
      }

      if (!hasLeftTouch) {
        this.joystickState.isActive = false;
      }
      if (!hasRightTouch) {
        this.aimState.isActive = false;
      }
    }
  }

  getInput(playerPos: Vec2): GameInput {
    const movement = this.getMovementInput();
    const aimAngle = this.aimState.isActive
      ? angleTo(playerPos, { x: this.aimState.x, y: this.aimState.y })
      : 0;
    const wantsFire = this.aimState.isActive && this.playerInteracted;

    return {
      movement,
      aimAngle,
      wantsFire,
      source: "touch",
    };
  }

  private getMovementInput(): Vec2 {
    if (!this.joystickState.isActive) {
      return { x: 0, y: 0 };
    }

    const dx = this.joystickState.currentX - this.joystickState.centerX;
    const dy = this.joystickState.currentY - this.joystickState.centerY;
    const d = Math.hypot(dx, dy);

    // Apply dead zone
    if (d < JOYSTICK_DEAD_ZONE) {
      return { x: 0, y: 0 };
    }

    // Normalize to joystick radius
    const maxDist = Math.min(d, this.joystickState.radius);
    return {
      x: (dx / d) * Math.min(1, maxDist / this.joystickState.radius),
      y: (dy / d) * Math.min(1, maxDist / this.joystickState.radius),
    };
  }

  getJoystickState(): TouchJoystickState {
    return this.joystickState;
  }

  getAimState(): TouchAimState {
    return this.aimState;
  }

  hasInteracted(): boolean {
    return this.playerInteracted;
  }

  setInteracted(value: boolean) {
    this.playerInteracted = value;
  }
}
