import { GameInput, Vec2 } from "./types";

const angleTo = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);

export class KeyboardInput {
  private keysPressed = new Set<string>();
  private mousePos: Vec2 = { x: 480, y: 320 };
  private mouseDown = false;
  private playerInteracted = false;

  constructor() {}

  onKeyDown(key: string) {
    this.keysPressed.add(key.toLowerCase());
  }

  onKeyUp(key: string) {
    this.keysPressed.delete(key.toLowerCase());
  }

  onMouseMove(e: MouseEvent, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    this.mousePos = {
      x: (e.clientX - r.left) * (canvasWidth / r.width),
      y: (e.clientY - r.top) * (canvasHeight / r.height),
    };
  }

  onMouseDown() {
    this.playerInteracted = true;
    this.mouseDown = true;
  }

  onMouseUp() {
    this.mouseDown = false;
  }

  getInput(playerPos: Vec2): GameInput {
    const k = this.keysPressed;

    // Get directional input
    let dx = 0,
      dy = 0;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (k.has("w") || k.has("arrowup")) dy -= 1;
    if (k.has("s") || k.has("arrowdown")) dy += 1;

    // Normalize diagonal
    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }

    return {
      movement: { x: dx, y: dy },
      aimAngle: angleTo(playerPos, this.mousePos),
      wantsFire: (this.mouseDown || k.has(" ")) && this.playerInteracted,
      source: "keyboard",
    };
  }

  getMousePos(): Vec2 {
    return this.mousePos;
  }

  setMousePos(pos: Vec2) {
    this.mousePos = pos;
  }

  hasInteracted(): boolean {
    return this.playerInteracted;
  }

  setInteracted(value: boolean) {
    this.playerInteracted = value;
  }
}
