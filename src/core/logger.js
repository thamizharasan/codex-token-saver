export function createLogger(options = {}) {
  const verbose = Boolean(options.verbose);
  const sink = options.sink ?? console;
  return {
    verbose,
    info(message) {
      sink.log?.(message);
    },
    debug(message) {
      if (verbose) sink.log?.(message);
    },
    error(error) {
      const message = error instanceof Error ? error.message : String(error);
      sink.error?.(verbose && error instanceof Error ? error.stack : message);
    }
  };
}
