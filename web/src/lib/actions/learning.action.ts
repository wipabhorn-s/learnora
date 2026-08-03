"use server";

import { LearningApi, LessonProgress } from "@/lib/api/learning.api";
import { auth } from "@/lib/auth";

export async function updateProgressAction(
  lessonId: number,
  lastPositionSeconds: number,
): Promise<LessonProgress | null> {
  const session = await auth();
  if (!session) return null;

  try {
    return await LearningApi.updateProgress(
      lessonId,
      lastPositionSeconds,
      session.user.access_token,
    );
  } catch {
    return null;
  }
}
