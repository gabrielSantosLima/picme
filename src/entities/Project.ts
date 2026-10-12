import { Frame } from './Frame'

export class Project {
  constructor(
    readonly width: number,
    readonly height: number,
    public frames: Frame[],
    public activeFrameIndex = 0,
  ) {}

  static create(width = 32, height = 32): Project {
    return new Project(width, height, [Frame.create(width, height)])
  }

  get activeFrame(): Frame {
    return this.frames[this.activeFrameIndex]
  }

  clone(): Project {
    return new Project(
      this.width,
      this.height,
      this.frames.map((frame) => frame.clone()),
      this.activeFrameIndex,
    )
  }
}
