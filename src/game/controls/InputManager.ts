import { KeyboardInput } from "./KeyboardInput";
import { TouchInput } from "./TouchInput";
import { GameInput, Vec2 } from "./types";

export class InputManager {
  private keyboard: KeyboardInput;
  private touch: TouchInput;
  private canvas: HTMLCanvasElement;
  private playerPos: Vec2 = { x: 480, y: 320 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.keyboard = new KeyboardInput();
    this.touch = new TouchInput();
  }

  attachListeners() {
    // Keyboard
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));

    // Mouse
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e));

    // Touch - listen on window for joystick outside canvas
    window.addEventListener("touchstart", (e) => this.onTouchStart(e));
    window.addEventListener("touchmove", (e) => this.onTouchMove(e));
    window.addEventListener("touchend", (e) => this.onTouchEnd(e));
  }

  detachListeners() {
    window.removeEventListener("keydown", (e) => this.onKeyDown(e));
    window.removeEventListener("keyup", (e) => this.onKeyUp(e));
    this.canvas.removeEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.removeEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.removeEventListener("mouseup", (e) => this.onMouseUp(e));
    window.removeEventListener("touchstart", (e) => this.onTouchStart(e));
    window.removeEventListener("touchmove", (e) => this.onTouchMove(e));
    window.removeEventListener("touchend", (e) => this.onTouchEnd(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
      e.preventDefault();
      this.keyboard.onKeyDown(k);
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
      e.preventDefault();
      this.keyboard.onKeyUp(k);
    }
  }

  private onMouseMove(e: MouseEvent) {
    this.keyboard.onMouseMove(e, this.canvas);
  }

  private onMouseDown(e: MouseEvent) {
    this.keyboard.onMouseDown();
    this.keyboard.setInteracted(true);
  }

  private onMouseUp(e: MouseEvent) {
    this.keyboard.onMouseUp();
  }

  private onTouchStart(e: TouchEvent) {
    this.touch.onTouchStart(e, this.canvas);
  }

  private onTouchMove(e: TouchEvent) {
    this.touch.onTouchMove(e, this.canvas);
  }

  private onTouchEnd(e: TouchEvent) {
    this.touch.onTouchEnd(e, this.canvas);
  }

  setPlayerPos(pos: Vec2) {
    this.playerPos = pos;
  }

  getInput(): GameInput {
    // Check if touch is active - prioritize touch input
    if (this.touch.hasInteracted()) {
      return this.touch.getInput(this.playerPos);
    }

    // Otherwise use keyboard/mouse
    return this.keyboard.getInput(this.playerPos);
  }

  getKeyboard(): KeyboardInput {
    return this.keyboard;
  }

  getTouch(): TouchInput {
    return this.touch;
  }

  hasPlayerInteracted(): boolean {
    return this.keyboard.hasInteracted() || this.touch.hasInteracted();
  }

  setPlayerInteracted(value: boolean) {
    this.keyboard.setInteracted(value);
    this.touch.setInteracted(value);
  }
}
