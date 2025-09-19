declare module 'bleno' {
  import { EventEmitter } from 'events';

  export interface CharacteristicOptions {
    uuid: string;
    properties: string[];
    value?: Buffer | null;
  }

  export interface ServiceOptions {
    uuid: string;
    characteristics: Characteristic[];
  }

  export class Characteristic extends EventEmitter {
    static RESULT_SUCCESS: number;

    constructor(options: CharacteristicOptions);

    onReadRequest?(offset: number, callback: (result: number, data?: Buffer) => void): void;
    onWriteRequest?(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void): void;
    onSubscribe?(maxValueSize: number, updateValueCallback: (data: Buffer) => void): void;
    onUnsubscribe?(): void;
  }

  export class PrimaryService {
    constructor(options: ServiceOptions);
  }

  export function on(event: string, listener: (...args: any[]) => void): void;
  export function once(event: string, listener: (...args: any[]) => void): void;
  export function setServices(services: PrimaryService[], callback?: (error: any) => void): void;
  export function startAdvertising(name: string, serviceUuids: string[], callback?: (error: any) => void): void;
  export function stopAdvertising(callback?: () => void): void;

  export const state: string;
}