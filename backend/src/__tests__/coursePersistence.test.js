import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Course model before importing module under test
const mockDropIndex = jest.fn();
const mockSyncIndexes = jest.fn();
const mockIndexes = jest.fn();
const mockCreate = jest.fn();

jest.unstable_mockModule("../models/Course.js", () => ({
  default: {
    collection: {
      indexes: mockIndexes,
      dropIndex: mockDropIndex,
    },
    syncIndexes: mockSyncIndexes,
    create: mockCreate,
  },
}));

const {
  isLegacyCourseTextIndexError,
  repairLegacyCourseTextIndex,
  withCourseWriteRepair,
  createCourseWithRepair,
  saveCourseWithRepair,
} = await import("../lib/coursePersistence.js");

describe("coursePersistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isLegacyCourseTextIndexError", () => {
    it("returns true for errors containing 'language override unsupported'", () => {
      const error = new Error("language override unsupported");
      expect(isLegacyCourseTextIndexError(error)).toBe(true);
    });

    it("is case-insensitive", () => {
      const error = new Error("Language Override Unsupported");
      expect(isLegacyCourseTextIndexError(error)).toBe(true);
    });

    it("matches partial message containing the phrase", () => {
      const error = new Error(
        "MongoError: language override unsupported in $text query",
      );
      expect(isLegacyCourseTextIndexError(error)).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      const error = new Error("Connection timeout");
      expect(isLegacyCourseTextIndexError(error)).toBe(false);
    });

    it("returns false for generic validation errors", () => {
      const error = new Error("ValidationError: Invalid field");
      expect(isLegacyCourseTextIndexError(error)).toBe(false);
    });

    it("returns false for null input", () => {
      expect(isLegacyCourseTextIndexError(null)).toBe(false);
    });

    it("returns false for undefined input", () => {
      expect(isLegacyCourseTextIndexError(undefined)).toBe(false);
    });

    it("returns false for error without message", () => {
      expect(isLegacyCourseTextIndexError({})).toBe(false);
    });

    it("returns false for empty string message", () => {
      expect(isLegacyCourseTextIndexError({ message: "" })).toBe(false);
    });
  });

  describe("repairLegacyCourseTextIndex", () => {
    it("drops legacy text indexes and syncs indexes", async () => {
      const legacyIndex = {
        name: "text_index_old",
        key: { title: "text", description: "text" },
      };
      const normalIndex = {
        name: "title_1",
        key: { title: 1 },
        language_override: "searchLanguage",
      };
      const textIndexWithCorrectOverride = {
        name: "text_index_new",
        key: { title: "text" },
        language_override: "searchLanguage",
      };
      mockIndexes.mockResolvedValue([
        legacyIndex,
        normalIndex,
        textIndexWithCorrectOverride,
      ]);
      mockDropIndex.mockResolvedValue(undefined);
      mockSyncIndexes.mockResolvedValue(undefined);

      await repairLegacyCourseTextIndex();

      expect(mockDropIndex).toHaveBeenCalledTimes(1);
      expect(mockDropIndex).toHaveBeenCalledWith("text_index_old");
      expect(mockSyncIndexes).toHaveBeenCalledTimes(1);
    });

    it("drops multiple legacy text indexes", async () => {
      const legacy1 = { name: "idx1", key: { title: "text" } };
      const legacy2 = { name: "idx2", key: { description: "text" } };
      mockIndexes.mockResolvedValue([legacy1, legacy2]);
      mockDropIndex.mockResolvedValue(undefined);
      mockSyncIndexes.mockResolvedValue(undefined);

      await repairLegacyCourseTextIndex();

      expect(mockDropIndex).toHaveBeenCalledTimes(2);
      expect(mockDropIndex).toHaveBeenCalledWith("idx1");
      expect(mockDropIndex).toHaveBeenCalledWith("idx2");
    });

    it("does not drop indexes without text fields", async () => {
      mockIndexes.mockResolvedValue([{ name: "idx1", key: { title: 1 } }]);
      mockDropIndex.mockResolvedValue(undefined);
      mockSyncIndexes.mockResolvedValue(undefined);

      await repairLegacyCourseTextIndex();

      expect(mockDropIndex).not.toHaveBeenCalled();
      expect(mockSyncIndexes).toHaveBeenCalledTimes(1);
    });

    it("skips indexes without a name", async () => {
      const indexWithoutName = { key: { title: "text" } };
      mockIndexes.mockResolvedValue([indexWithoutName]);
      mockDropIndex.mockResolvedValue(undefined);
      mockSyncIndexes.mockResolvedValue(undefined);

      await repairLegacyCourseTextIndex();

      expect(mockDropIndex).not.toHaveBeenCalled();
      expect(mockSyncIndexes).toHaveBeenCalledTimes(1);
    });

    it("calls syncIndexes even when no legacy indexes exist", async () => {
      mockIndexes.mockResolvedValue([]);
      mockSyncIndexes.mockResolvedValue(undefined);

      await repairLegacyCourseTextIndex();

      expect(mockSyncIndexes).toHaveBeenCalledTimes(1);
    });
  });

  describe("withCourseWriteRepair", () => {
    it("returns result of operation on success", async () => {
      const operation = jest.fn().mockResolvedValue({ _id: "123" });

      const result = await withCourseWriteRepair(operation);

      expect(result).toEqual({ _id: "123" });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("rethrows non-legacy errors without repair", async () => {
      const error = new Error("Network failure");
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withCourseWriteRepair(operation)).rejects.toThrow(
        "Network failure",
      );
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockIndexes).not.toHaveBeenCalled();
    });

    it("repairs and retries on legacy text index error", async () => {
      const legacyError = new Error("language override unsupported");
      const successResult = { _id: "456" };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(legacyError)
        .mockResolvedValueOnce(successResult);

      mockIndexes.mockResolvedValue([]);
      mockSyncIndexes.mockResolvedValue(undefined);

      const result = await withCourseWriteRepair(operation);

      expect(result).toEqual(successResult);
      expect(operation).toHaveBeenCalledTimes(2);
      expect(mockSyncIndexes).toHaveBeenCalledTimes(1);
    });

    it("throws repair result error if retry also fails", async () => {
      const legacyError = new Error("language override unsupported");
      const retryError = new Error("Retry failed");
      const operation = jest
        .fn()
        .mockRejectedValueOnce(legacyError)
        .mockRejectedValueOnce(retryError);

      mockIndexes.mockResolvedValue([]);
      mockSyncIndexes.mockResolvedValue(undefined);

      await expect(withCourseWriteRepair(operation)).rejects.toThrow(
        "Retry failed",
      );
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe("createCourseWithRepair", () => {
    it("calls Course.create with the provided payload", async () => {
      const payload = { title: "Test Course", code: "TC101" };
      const createdCourse = { _id: "abc", ...payload };
      mockCreate.mockResolvedValue(createdCourse);

      const result = await createCourseWithRepair(payload);

      expect(mockCreate).toHaveBeenCalledWith(payload);
      expect(result).toEqual(createdCourse);
    });

    it("retries course creation on legacy index error", async () => {
      const payload = { title: "Test", code: "T001" };
      const legacyError = new Error("language override unsupported");
      mockCreate
        .mockRejectedValueOnce(legacyError)
        .mockResolvedValueOnce({ _id: "xyz", ...payload });

      mockIndexes.mockResolvedValue([]);
      mockSyncIndexes.mockResolvedValue(undefined);

      const result = await createCourseWithRepair(payload);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject(payload);
    });

    it("propagates non-legacy errors", async () => {
      const payload = { title: "Test" };
      mockCreate.mockRejectedValue(new Error("Duplicate key error"));

      await expect(createCourseWithRepair(payload)).rejects.toThrow(
        "Duplicate key error",
      );
    });
  });

  describe("saveCourseWithRepair", () => {
    it("calls course.save() and returns result", async () => {
      const mockSave = jest.fn().mockResolvedValue({ _id: "saved" });
      const course = { save: mockSave };

      const result = await saveCourseWithRepair(course);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: "saved" });
    });

    it("retries save on legacy index error", async () => {
      const legacyError = new Error("language override unsupported");
      const mockSave = jest
        .fn()
        .mockRejectedValueOnce(legacyError)
        .mockResolvedValueOnce({ _id: "repaired" });
      const course = { save: mockSave };

      mockIndexes.mockResolvedValue([]);
      mockSyncIndexes.mockResolvedValue(undefined);

      const result = await saveCourseWithRepair(course);

      expect(mockSave).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ _id: "repaired" });
    });

    it("propagates validation errors from save", async () => {
      const mockSave = jest
        .fn()
        .mockRejectedValue(new Error("ValidationError: title required"));
      const course = { save: mockSave };

      await expect(saveCourseWithRepair(course)).rejects.toThrow(
        "ValidationError: title required",
      );
    });
  });
});