import { type PageSnapshotType } from '../types'

export class Page {
  private _text: string | null
  private _replic: string | null
  private _image: string | null
  private _video: string | null
  private _voice: string | null
  private _html: string | null
  private _isMarker: boolean

  public get text(): string | null {
    return this._text
  }

  public get replic(): string | null {
    return this._replic
  }

  public get image(): string | null {
    return this._image
  }

  public get video(): string | null {
    return this._video
  }

  public get voice(): string | null {
    return this._voice
  }

  public get html(): string | null {
    return this._html
  }

  public get isMarker(): boolean {
    return this._isMarker
  }

  public get snapshot(): PageSnapshotType {
    return {
      text: this.text,
      replic: this.replic,
      image: this.image,
      video: this.video,
      voice: this.voice,
      html: this.html,
      isMarker: this.isMarker,
    }
  }

  constructor(options: {
    text: string | null;
    replic: string | null;
    image: string | null;
    video: string | null;
    voice: string | null;
    html: string | null;
    isMarker: boolean;
  }) {
    this._text = options.text
    this._replic = options.replic
    this._image = options.image
    this._video = options.video
    this._voice = options.voice
    this._html = options.html
    this._isMarker = options.isMarker
  }

  public setReplic(value: string) {
    this._replic = value
  }
}
