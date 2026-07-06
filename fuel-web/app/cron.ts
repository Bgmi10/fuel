import { prisma } from "@/prisma";
import cron from "node-cron";

import {
  addDaysUTC,
  diffDaysUTC,
  nowUTC,
  toUTC,
} from "@/app/utils/date";

let isCronStarted = false;

export const jobs = () => {
  if (isCronStarted) {
    console.log("Cron already started");
    return;
  }

  isCronStarted = true;

  console.log("Starting cron jobs...");

  // Every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const now = nowUTC();

      // 🔥 Find completed freezes
      const frozenSubs = await prisma.subscription.findMany({
        where: {
          status: "FROZEN",
          freezeEnd: {
            lte: now,
          },
        },
      });

      for (const sub of frozenSubs) {
        if (!sub.freezeStart || !sub.freezeEnd) {
          continue;
        }

        // 🔥 UTC SAFE
        const freezeStart = toUTC(sub.freezeStart);
        const freezeEnd = toUTC(sub.freezeEnd);

        // 🔥 Calculate freeze duration
        const freezeDays = diffDaysUTC(
          freezeStart,
          freezeEnd
        );

        // 🔥 Extend membership
        const newEndDate = addDaysUTC(
          sub.endDate,
          freezeDays
        );

        await prisma.subscription.update({
          where: {
            id: sub.id,
          },
          data: {
            status: "ACTIVE",

            freezeStart: null,
            freezeEnd: null,

            endDate: newEndDate,
          },
        });

        console.log(
          `✅ Auto unfroze subscription ${sub.id}`
        );
      }
    } catch (e) {
      console.log("CRON ERROR", e);
    }
  });
};