import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class AsyncStorageService {
  private readonly als = new AsyncLocalStorage<Record<string, any>>();

  run(store: Record<string, any>, fn: (...args: any[]) => void) {
    this.als.run(store, fn);
  }

  set(key: string, value: any) {
    const store = this.als.getStore();
    // eslint-disable-next-line
    if (store) store[key] = value;
  }

  get<T = any>(key: string): T | undefined {
    const store = this.als.getStore();
    return store ? (store[key] as T) : undefined;
  }
}
