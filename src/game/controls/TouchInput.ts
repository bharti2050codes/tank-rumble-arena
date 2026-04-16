import { GameInput, Vec2, TouchJoystickState, TouchAimState } from "./types";

const angleTo = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

const JOYSTICK_RADIUS = 60;
const JOYSTICK_DEAD_ZONE = 8;
const TOUCH_ZONE_LEFT = 0.35; // Left 35% is joystick

interface TouchTracker {
  id: number;
  x: number;
  y: number;
  isJoystick: boolean;
}

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

  private firePressed = false;
  private playerInteracted = false;
  private touches = new Map<number, TouchTracker>();
  private joystickTrackingId: number | null = null;
  private canvasWidth = 960;
  private canvasHeight = 640;

  constructor() {}

  setCanvasDimensions(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  onTouchStart(e: TouchEvent, canvas?: HTMLCanvasElement) {
    this.playerInteracted = true;
    
    // Get canvas reference from the event target or parameter
    const targetCanvas = canvas || (e.target as HTMLCanvasElement);
    if (!targetCanvas) return;

    const r = targetCanvas.getBoundingClientRect();
    this.canvasWidth = targetCanvas.width;
    this.canvasHeight = targetCanvas.height;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = (touch.clientX - r.left) * (targetCanvas.width / r.width);
      const y = (touch.clientY - r.top) * (targetCanvas.height / r.height);
      const id = touch.identifier;

      // Skip if already tracking this touch
      if (this.touches.has(id)) continue;

      // Skip if touch is outside canvas
      if (x < 0 || x > targetCanvas.width || y < 0 || y > targetCanvas.height) {
        continue;
      }

      // Check if this touch is on the joystick (bottom-left area)
      const margin = 15;
      const joystickRadius = 70; // Increased from 60 to match canvas drawing
      const joystickCenterX = margin + joystickRadius;
      const joystickCenterY = targetCanvas.height - margin - joystickRadius;
      const joystickTouchRadius = 110; // Larger touch area

      const distToJoystick = dist({ x, y }, { x: joystickCenterX, y: joystickCenterY });
      const isOnJoystick = distToJoystick < joystickTouchRadius;

      if (isOnJoystick && this.joystickTrackingId === null) {
        // Start joystick tracking
        this.joystickTrackingId = id;
        this.joystickState.isActive = true;
        this.joystickState.centerX = x;
        this.joystickState.centerY = y;
        this.joystickState.currentX = x;
        this.joystickState.currentY = y;
      }

      // Any tap outside the joystick AND on the canvas fires
      if (!isOnJoystick) {
        this.aimState.isActive = true;
        this.aimState.x = x;
        this.aimState.y = y;
        this.firePressed = true;
      }

      this.touches.set(id, {
        id,
        x,
        y,
        isJoystick: isOnJoystick,
      });
    }
  }

  onTouchMove(e: TouchEvent, canvas?: HTMLCanvasElement) {
    const targetCanvas = canvas || (e.target as HTMLCanvasElement);
    if (!targetCanvas) return;

    const r = targetCanvas.getBoundingClientRect();
    this.canvasWidth = targetCanvas.width;
    this.canvasHeight = targetCanvas.height;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = (touch.clientX - r.left) * (targetCanvas.width / r.width);
      const y = (touch.clientY - r.top) * (targetCanvas.height / r.height);
      const id = touch.identifier;

      const tracker = this.touches.get(id);
      if (!tracker) continue;

      // Update joystick position if this is the joystick touch
      if (this.joystickTrackingId === id && this.joystickState.isActive) {
        this.joystickState.currentX = x;
        this.joystickState.currentY = y;
      }

      tracker.x = x;
      tracker.y = y;
    }
  }

  onTouchEnd(e: TouchEvent, canvas?: HTMLCanvasElement) {
    const targetCanvas = canvas || (e.target as HTMLCanvasElement);
    if (!targetCanvas) return;

    const r = targetCanvas.getBoundingClientRect();
    this.canvasWidth = targetCanvas.width;
    this.canvasHeight = targetCanvas.height;

    // Check which touches ended
    const touchIds = new Set<number>();
    for (let i = 0; i < e.touches.length; i++) {
      touchIds.add(e.touches[i].identifier);
    }

    // Remove ended touches
    for (const [id, tracker] of this.touches) {
      if (!touchIds.has(id)) {
        if (this.joystickTrackingId === id) {
          this.joystickState.isActive = false;
          this.joystickTrackingId = null;
        }
        this.touches.delete(id);
      }
    }

    // If no more touches, deactivate fire
    if (e.touches.length === 0) {
      this.aimState.isActive = false;
      this.firePressed = false;
    }
  }

  getInput(playerPos: Vec2): GameInput {
    const movement = this.getMovementInput();
    const aimAngle = this.getAimAngle(playerPos);
    const wantsFire = this.firePressed;

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

  private getAimAngle(playerPos: Vec2): number {
    if (!this.aimState.isActive) {
      return 0;
    }
    return angleTo(playerPos, { x: this.aimState.x, y: this.aimState.y });
  }

  getJoystickState(): TouchJoystickState {
    return this.joystickState;
  }

  getAimState(): TouchAimState {
    return this.aimState;
  }

  getFireButtonState() {
    return {
      isActive: this.aimState.isActive,
      x: this.aimState.x,
      y: this.aimState.y,
      pressed: this.firePressed,
      radius: 50,
    };
  }

  hasInteracted(): boolean {
    return this.playerInteracted;
  }

  setInteracted(value: boolean) {
    this.playerInteracted = value;
  }
}
