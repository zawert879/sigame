
/* eslint-disable @typescript-eslint/no-namespace */

import type AdmZip from 'adm-zip'
import { type Context } from 'koa'

export type Data = {
  texts: Map<string, AdmZip.IZipEntry>;
  images: Map<string, AdmZip.IZipEntry>;
  audios: Map<string, AdmZip.IZipEntry>;
  videos: Map<string, AdmZip.IZipEntry>;
  content: SIQ.Content;
}
export namespace SIQ {
  export type Content = {
    package: Content.Package;
  }

  export namespace Content {
    export type Package = {
      tags: {
        tag: string[];
      };
      info: Package.Info;
      rounds: {
        round: Package.Round[] | Package.Round;
      };
      attributes: {
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
      export enum RoundType {
        FINAL = 'final',
      }
      export type Round = {
        info?: {
          sources?: {
            source: string;
          };
          comments: string;
        };
        themes: {
          theme: Round.Theme[];
        };
        attributes: {
          name: string;
          type?: RoundType;
        };
      }
      export namespace Round {
        export type Theme = {
          info?: Info;
          questions: {
            question: Theme.Question[] | Theme.Question;
          };
          attributes: {
            name: string;
          };
        }
        export namespace Theme {
          export type Question = {
            info?: Info;
            params?: { param: any };
            right?: {
              answer: string;
            };
            wrong?: {
              answer: string;
            };
            attributes: { price: string; type?: 'stake' | 'secret' | 'secretPublicPrice' | 'secretNoQuestion' | 'noRisk' };
          }
          export namespace Question {
            export enum QuestionType {
              STAKE = 'stake',
              SECRET = 'secret',
              SECRET_PUBLIC_PRICE = 'secretPublicPrice',
              SECRET_NO_QUESTION = 'secretNoQuestion',
              NO_RISK = 'noRisk',
              BAG_CAT = 'bagcat',
              AUCTION = 'auction',
              SPONSORED = 'sponsored',
            }
            export type ScenarioAtom = {
              '#text'?: string;
              attributes: {
                type?: ScenarioAtom.ScenarioAtomType;
                time?: string;
              };
            }
            export namespace ScenarioAtom {
              export enum ScenarioAtomType {
                IMAGE = 'image',
                VIDEO = 'video',
                VOICE = 'voice',
                HTML = 'html',
                MARKER = 'marker',
              }
            }
            export type Type = {
              param?: Type.Param[];
              attributes: { name: string };
            }
            export namespace Type {
              export enum AttributeName {
                THEME = 'theme',
                COST = 'cost',
                SELF = 'self',
                KNOWS = 'knows',
              }
              export type Param = {
                '#text': string | number | boolean;
                attributes: {
                  name: AttributeName;
                };
              }
            }
          }
        }
      }
      export type Info = {
        authors?: {
          author: string;
        };
        comments: string;
      }
    }
  }
}

export type MyContext = Context & {
  appState: {
  };
}
