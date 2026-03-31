import Course from "../models/Course.js";

const hasTextIndex = (index = {}) => Object.values(index.key || {}).includes("text");

export const isLegacyCourseTextIndexError = (error) =>
  /language override unsupported/i.test(error?.message || "");

export async function repairLegacyCourseTextIndex() {
  const indexes = await Course.collection.indexes();
  const legacyTextIndexes = indexes.filter(
    (index) => hasTextIndex(index) && index.language_override !== "searchLanguage",
  );

  for (const index of legacyTextIndexes) {
    if (index.name) {
      await Course.collection.dropIndex(index.name);
    }
  }

  await Course.syncIndexes();
}

export async function withCourseWriteRepair(operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isLegacyCourseTextIndexError(error)) {
      throw error;
    }

    await repairLegacyCourseTextIndex();
    return operation();
  }
}

export async function createCourseWithRepair(payload) {
  return withCourseWriteRepair(() => Course.create(payload));
}

export async function saveCourseWithRepair(course) {
  return withCourseWriteRepair(() => course.save());
}
