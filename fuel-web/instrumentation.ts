export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { jobs } = await import("./app/cron");

    jobs();
  }
}