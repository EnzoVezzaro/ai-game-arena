export interface ParsedArgs {
  _: string[];
  [key: string]: string | string[] | boolean | undefined;
}

export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    if (arg === '--') {
      result._.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }

  return result;
}

export function getPositional(args: ParsedArgs, index: number): string {
  return args._[index] ?? '';
}
