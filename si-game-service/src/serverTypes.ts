import type AdmZip from 'adm-zip'
import type { OneOrMany } from './utils/siqValue'

export type Data = {
  texts: Map<string, AdmZip.IZipEntry>;
  images: Map<string, AdmZip.IZipEntry>;
  audios: Map<string, AdmZip.IZipEntry>;
  videos: Map<string, AdmZip.IZipEntry>;
  htmls: Map<string, AdmZip.IZipEntry>;
  content: SIQ.Content;
}

export declare namespace SIQ {
  export type Text = string | {
    '#text'?: string;
    attributes?: Record<string, string>;
  }

  export type Content = {
    package?: Content.Package;
  }

  export namespace Content {
    export type Package = {
      tags?: {
        tag?: OneOrMany<Text>;
      };
      info?: Package.Info;
      rounds?: {
        round?: OneOrMany<Package.Round>;
      };
      attributes?: {
        name?: string;
        version?: string;
        id?: string;
        restriction?: string;
        date?: string;
        publisher?: string;
        difficulty?: string;
        logo?: string;
        language?: string;
        xmlns?: string;
      };
    }

    export namespace Package {
      export type Info = {
        authors?: {
          author?: OneOrMany<Text>;
        };
        sources?: {
          source?: OneOrMany<Text>;
        };
        comments?: Text;
      }

      export type Round = {
        info?: Info;
        themes?: {
          theme?: OneOrMany<Round.Theme>;
        };
        attributes?: {
          name?: string;
          type?: string;
        };
      }

      export namespace Round {
        export type Theme = {
          info?: Info;
          questions?: {
            question?: OneOrMany<Theme.Question>;
          };
          attributes?: {
            name?: string;
          };
        }

        export namespace Theme {
          export type Question = {
            info?: Info;
            params?: {
              param?: OneOrMany<Question.Param>;
            };
            type?: Question.Type;
            scenario?: {
              atom?: OneOrMany<Question.ScenarioAtom>;
            };
            right?: {
              answer?: OneOrMany<Text>;
            };
            wrong?: {
              answer?: OneOrMany<Text>;
            };
            attributes?: {
              price?: string;
              type?: string;
            };
          }

          export namespace Question {
            export type Param = {
              '#text'?: string;
              item?: OneOrMany<ContentItem>;
              param?: OneOrMany<Param>;
              numberSet?: {
                attributes?: {
                  minimum?: string;
                  maximum?: string;
                  step?: string;
                };
              };
              attributes?: {
                name?: string;
                type?: string;
              };
            }

            export type ContentItem = string | {
              '#text'?: string;
              attributes?: {
                type?: string;
                isRef?: string;
                waitForFinish?: string;
                placement?: string;
                duration?: string;
              };
            }

            export type ScenarioAtom = string | {
              '#text'?: string;
              attributes?: {
                type?: string;
                time?: string;
              };
            }

            export type Type = {
              param?: OneOrMany<Type.Param>;
              attributes?: {
                name?: string;
              };
            }

            export namespace Type {
              export type Param = string | {
                '#text'?: string;
                attributes?: {
                  name?: string;
                };
              }
            }
          }
        }
      }
    }
  }
}
