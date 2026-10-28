/** Both browser apps use the same API; only configured origins are allowed. */
export function corsOrigins(env: Record<string, string | undefined>) {
  return [
    ...new Set(
      [env.FRONTEND_URL, env.ASSISTANT_APP_URL]
        .filter(Boolean)
        .map((value) => new URL(value).origin),
    ),
  ];
}
