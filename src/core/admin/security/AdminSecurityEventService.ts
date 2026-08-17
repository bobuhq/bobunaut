import { supabase } from "../../../lib/supabase";

export const AdminSecurityEventService = {
  async reportDeniedAccess(): Promise<void> {
    try {
      const { error } =
        await supabase.functions.invoke(
          "admin-security-event",
          {
            body: {
              eventType:
                "admin_console_access_denied",
            },
          },
        );

      if (error) {
        console.error(
          "[AdminSecurity] Unable to report denied access:",
          error,
        );
      }
    } catch (error) {
      /*
       * Security telemetry must never interfere
       * with the AdminRoute authorization flow.
       */
      console.error(
        "[AdminSecurity] Security event exception:",
        error,
      );
    }
  },
};
