import { Page } from './Page'

export class PageBuilder {
  private _pages: Page[] = []
  private _previousPage: Page | null = null

  private _text: string | null = null
  private _replic: string | null = null
  private _image: string | null = null
  private _video: string | null = null
  private _voice: string | null = null
  private _html: string | null = null

  private _isMarker = false

  private _isNewPage = false

  public setImage(image: string | null): this {
    this._image = image
    this._isNewPage = true
    return this
  }

  public setText(text: string | null): this {
    this._text = text
    this._isNewPage = true
    return this
  }

  public setReplic(text: string | null): this {
    this._replic = text
    this._isNewPage = false
    return this
  }

  public setVideo(video: string | null): this {
    this._video = video
    this._isNewPage = true
    return this
  }

  public setVoice(voice: string | null): this {
    this._voice = voice
    this._isNewPage = true
    return this
  }

  public setHtml(html: string | null): this {
    this._html = html
    this._isNewPage = true
    return this
  }

  public setMarker(isMarker: boolean): this {
    this._isMarker = isMarker
    this._isNewPage = true
    return this
  }

  public saveAndNextPage(): this {
    this.savePage()
    return this
  }

  public finish(): Page[] {
    this.savePage()
    return this._pages
  }

  public clear(): this {
    this.refresh()
    this._pages = []
    return this
  }

  public refresh(): this {
    this._text = null
    this._image = null
    this._video = null
    this._voice = null
    this._html = null
    this._isMarker = false
    this._isNewPage = false

    return this
  }

  private savePage() {
    if (this._isNewPage) {
      const page = new Page({
        text: this._text,
        replic: this._replic,
        image: this._image,
        video: this._video,
        voice: this._voice,
        html: this._html,
        isMarker: this._isMarker,
      })
      this._previousPage = page
      this._pages.push(page)
    }

    this.refresh()
  }
}
