type Store = (key: string) => string | undefined;

class ValidT {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  required(store: Store): string {
    const value = store(this.key);
    if (value) return value;
    else throw new Error(`${this.key} is required`);
  }

  as<T>(store: Store, parser: (s: string) => T | undefined): T | undefined {
    const value = store(this.key);
    if (value) return parser(value);
  }
}

export function Valid(key: string): ValidT {
  return new ValidT(key);
}
