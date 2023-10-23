import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wnpphaccyjobbojjkvat.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducHBoYWNjeWpvYmJvamprdmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIxMDU0MzAsImV4cCI6MjAwNzY4MTQzMH0.zZStzJDj_OGENGRX1a7bx-hjYt6ENdDZJbXlpHSwTDI",
);

const PIER_MPC_SERVER_HTTP_URL =
  "https://mpc-server-7ca971e09088.herokuapp.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api: any = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `${PIER_MPC_SERVER_HTTP_URL}/trpc`,
      async headers() {
        const session = await supabase.auth.getSession();
        if (session.error) {
          throw new Error(session.error.message);
        }
        if (!session.data.session) {
          throw new Error("failed to login");
        }

        return {
          authorization: `Bearer ${session.data.session.access_token}`,
        };
      },
    }),
  ],
});
