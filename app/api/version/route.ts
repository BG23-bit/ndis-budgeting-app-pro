// Reports the build the server is currently running. Open browser tabs poll
// this and offer a refresh when a newer deployment goes live — so nobody
// keeps working (or generating documents) on stale code after a deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { sha: (process.env.VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7) },
    { headers: { "cache-control": "no-store" } },
  );
}
