/** Browser app URLs may be comma- or whitespace-separated; only their origins are allowed. */
export function corsOrigins(env: Record<string, string | undefined>) {
  return [
    ...new Set(
      [env.FRONTEND_URL, env.ASSISTANT_APP_URL]
        .filter(Boolean)
        .flatMap((value) => value.split(/[,\s]+/))
        .filter(Boolean)
        .map((value) => new URL(value).origin),
    ),
  ];
}
