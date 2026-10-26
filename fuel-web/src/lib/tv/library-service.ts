import { prisma } from "../../../prisma";
import { HttpError } from "./errors";

/** Throws 400 unless every id is an existing, enabled library video. */
export async function assertActiveVideoIds(videoIds: string[]): Promise<void> {
  const unique = [...new Set(videoIds)];

  if (unique.length === 0) {
    return;
  }

  const found = await prisma.workoutVideo.findMany({
    where: { id: { in: unique }, isActive: true },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    throw new HttpError(
      400,
      "One or more selected library videos are missing or disabled."
    );
  }
}

export async function assertUsableProgram(programId: string): Promise<void> {
  const program = await prisma.workoutProgram.findUnique({
    where: { id: programId },
    select: { isActive: true },
  });

  if (!program) {
    throw new HttpError(404, "Workout program not found.");
  }

  if (!program.isActive) {
    throw new HttpError(400, "This workout program is disabled.");
  }
}

/** Library video OR manual name -> schedule exercise rows. */
export function toScheduleExerciseRows(
  items: ({ videoId: string } | { exerciseName: string })[]
) {
  return items.map((item, sortOrder) =>
    "videoId" in item
      ? { sortOrder, videoId: item.videoId, exerciseName: null }
      : { sortOrder, videoId: null, exerciseName: item.exerciseName }
  );
}
