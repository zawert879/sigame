import type AdmZip from 'adm-zip'
import type { OneOrMany } from './utils/siqValue'

// A parsed .siq archive. Asset maps are keyed by '@<entry name without the folder>'.
export type Data = {
  texts: Map<string, AdmZip.IZipEntry>;
  images: Map<string, AdmZip.IZipEntry>;
  audios: Map<string, AdmZip.IZipEntry>;
  videos: Map<string, AdmZip.IZipEntry>;
  content: SIQ.Content;
}

// Raw structure of content.xml as produced by fast-xml-parser
// (attributes in `attributes`, text of an element with attributes in '#text', single elements are not arrays,
// empty elements are ''). Covers SIQ 5 (`params`) and SIQ 4 (`type` + `scenario`).
// Types only, hence `declare`: the namespaces group the element types and emit no code.
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
          // 'final' for the final round, anything else is a regular round
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
            // SIQ 5
            params?: {
              param?: OneOrMany<Question.Param>;
            };
            // SIQ 4
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
              // SIQ 5 question type: stake | secret | secretPublicPrice | secretNoQuestion | noRisk | simple | ...
              type?: string;
            };
          }

          export namespace Question {
            // SIQ 5 <param>. Content params hold `item`s, a group param (type="group") holds nested params.
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

            // SIQ 5 content <item>
            export type ContentItem = string | {
              '#text'?: string;
              attributes?: {
                type?: string; // text | image | audio | video | html
                isRef?: string;
                waitForFinish?: string;
                placement?: string; // screen | replic | background
                duration?: string;
              };
            }

            // SIQ 4 <atom>
            export type ScenarioAtom = string | {
              '#text'?: string;
              attributes?: {
                type?: string; // text | say | image | voice | video | html | marker
                time?: string;
              };
            }

            // SIQ 4 <type name="cat|bagcat|auction|sponsored|simple">
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
                  name?: string; // theme | cost | self | knows
                };
              }
            }
          }
        }
      }
    }
  }
}
