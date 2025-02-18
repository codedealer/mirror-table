// plugins/logger.ts
import debug from 'debug';

export interface Logger {
  [key: string]: debug.Debugger
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  if (typeof window !== 'undefined' && config.public.debugEnabled) {
    debug.enable(config.public.debugNamespace);
  } else {
    debug.disable();
  }

  const loggers: Record<string, debug.Debugger> = {};

  const createLogger = (dbg: debug.Debugger) => {
    dbg.log = console.log.bind(console);

    return dbg;
  };

  const logger = new Proxy<Logger>({
    warn: console.warn,
    error: console.error,
  } as Logger, {
    get (target, prop: string) {
      if (prop in target) {
        return target[prop];
      }

      if (!loggers[prop]) {
        loggers[prop] = createLogger(debug(`app:${prop}`));
      }

      return loggers[prop];
    },
  });

  return {
    provide: {
      logger,
    },
  };
});
