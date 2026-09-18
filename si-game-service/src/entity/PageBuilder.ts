import { Page } from './Page'

// Accumulates the content of one page; saveAndNextPage() stores it when anything was set.
// A replic does not create a page by itself: it is attached to the next saved page of the same section (question or
// answer). At the end of a section (endSection, finish) a replic that still waits gets a page of its own, so it is
// never moved into the answer or lost.
export class PageBuilder {
  private _pages: Page[] = []

  private _text: string | null = null
  private _replic: string | null = null
  private _image: string | null = null
  private _video: string | null = null
  private _voice: string | null = null
  private _html: string | null = null

  private _isMarker = false

  private _isNewPage = false

  public get hasPendingPage(): boolean {
    return this._isNewPage
  }

  public get pagesCount(): number {
    return this._pages.length
  }

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

  // stores the pending page, or a waiting replic as a page of its own
  public endSection(): this {
    if (this._replic !== null) {
      this._isNewPage = true
    }

    return this.saveAndNextPage()
  }

  public finish(): Page[] {
    this.endSection()
    return this._pages
  }

  public clear(): this {
    this.refresh()
    this._pages = []
    return this
  }

  public refresh(): this {
    this._text = null
    this._replic = null
    this._image = null
    this._video = null
    this._voice = null
    this._html = null
    this._isMarker = false
    this._isNewPage = false

    return this
  }

  private savePage() {
    if (!this._isNewPage) {
      // nothing to save; a pending replic waits for the next page
      return
    }

    this._pages.push(new Page({
      text: this._text,
      replic: this._replic,
      image: this._image,
      video: this._video,
      voice: this._voice,
      html: this._html,
      isMarker: this._isMarker,
    }))
    this.refresh()
  }
}
