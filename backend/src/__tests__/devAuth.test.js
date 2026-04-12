import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock dependencies before importing module under test
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockSave = jest.fn();
const mockUpsertStreamUser = jest.fn();

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findOne: mockFindOne,
    create: mockCreate,
  },
}));

jest.unstable_mockModule("../lib/stream.js", () => ({
  upsertStreamUser: mockUpsertStreamUser,
}));

// ENV mock - devAuth enabled by default in tests
jest.unstable_mockModule("../lib/env.js", () => ({
  ENV: { DEV_AUTH_BYPASS: "true" },
}));

const {
  isDevAuthEnabled,
  extractDevAuthHeaders,
  extractDevSocketAuth,
  findOrCreateDevUser,
} = await import("../lib/devAuth.js");

describe("devAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isDevAuthEnabled", () => {
    it("is true when DEV_AUTH_BYPASS is 'true'", () => {
      expect(isDevAuthEnabled).toBe(true);
    });
  });

  describe("extractDevAuthHeaders", () => {
    it("returns null when x-dev-auth-id header is missing", () => {
      const result = extractDevAuthHeaders({ "x-dev-auth-role": "student" });
      expect(result).toBeNull();
    });

    it("returns null for empty headers", () => {
      expect(extractDevAuthHeaders({})).toBeNull();
    });

    it("returns null for no arguments", () => {
      expect(extractDevAuthHeaders()).toBeNull();
    });

    it("returns user payload when x-dev-auth-id is provided", () => {
      const headers = {
        "x-dev-auth-id": "alice",
        "x-dev-auth-role": "teacher",
        "x-dev-auth-name": "Alice Smith",
        "x-dev-auth-email": "alice@example.com",
      };
      const result = extractDevAuthHeaders(headers);
      expect(result).not.toBeNull();
      expect(result.name).toBe("Alice Smith");
      expect(result.role).toBe("teacher");
      expect(result.email).toBe("alice@example.com");
    });

    it("builds clerkId with dev- prefix", () => {
      const headers = { "x-dev-auth-id": "bob" };
      const result = extractDevAuthHeaders(headers);
      expect(result.clerkId).toBe("dev-bob");
    });

    it("does not double-prefix clerkId that already starts with dev-", () => {
      const headers = { "x-dev-auth-id": "dev-charlie" };
      const result = extractDevAuthHeaders(headers);
      expect(result.clerkId).toBe("dev-charlie");
    });

    it("defaults role to student when not provided", () => {
      const headers = { "x-dev-auth-id": "dave" };
      const result = extractDevAuthHeaders(headers);
      expect(result.role).toBe("student");
    });

    it("defaults role to student for invalid role value", () => {
      const headers = { "x-dev-auth-id": "eve", "x-dev-auth-role": "admin" };
      const result = extractDevAuthHeaders(headers);
      expect(result.role).toBe("student");
    });

    it("accepts 'teacher' role", () => {
      const headers = { "x-dev-auth-id": "frank", "x-dev-auth-role": "teacher" };
      const result = extractDevAuthHeaders(headers);
      expect(result.role).toBe("teacher");
    });

    it("uses default email for student when not provided", () => {
      const headers = { "x-dev-auth-id": "grace" };
      const result = extractDevAuthHeaders(headers);
      expect(result.email).toBe("student@cloud-desk.dev");
    });

    it("uses default email for teacher when not provided", () => {
      const headers = { "x-dev-auth-id": "henry", "x-dev-auth-role": "teacher" };
      const result = extractDevAuthHeaders(headers);
      expect(result.email).toBe("teacher@cloud-desk.dev");
    });

    it("uses default name Demo Student for student", () => {
      const headers = { "x-dev-auth-id": "irene" };
      const result = extractDevAuthHeaders(headers);
      expect(result.name).toBe("Demo Student");
    });

    it("uses default name Demo Teacher for teacher", () => {
      const headers = {
        "x-dev-auth-id": "jake",
        "x-dev-auth-role": "teacher",
      };
      const result = extractDevAuthHeaders(headers);
      expect(result.name).toBe("Demo Teacher");
    });
  });

  describe("extractDevSocketAuth", () => {
    it("returns null when auth has no devAuth field", () => {
      expect(extractDevSocketAuth({})).toBeNull();
    });

    it("returns null for null input", () => {
      expect(extractDevSocketAuth(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(extractDevSocketAuth(undefined)).toBeNull();
    });

    it("returns user payload when devAuth is provided in socket auth", () => {
      const auth = {
        devAuth: {
          id: "socket-user",
          role: "student",
          name: "Socket User",
          email: "socket@example.com",
        },
      };
      const result = extractDevSocketAuth(auth);
      expect(result).not.toBeNull();
      expect(result.name).toBe("Socket User");
      expect(result.role).toBe("student");
    });

    it("builds clerkId from devAuth.id", () => {
      const auth = { devAuth: { id: "myuser" } };
      const result = extractDevSocketAuth(auth);
      expect(result.clerkId).toBe("dev-myuser");
    });

    it("defaults clerkId to dev-student when id is empty", () => {
      const auth = { devAuth: { id: "" } };
      const result = extractDevSocketAuth(auth);
      expect(result.clerkId).toBe("dev-student");
    });
  });

  describe("findOrCreateDevUser", () => {
    it("returns null when devAuth is null", async () => {
      const result = await findOrCreateDevUser(null);
      expect(result).toBeNull();
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it("returns null when devAuth is undefined", async () => {
      const result = await findOrCreateDevUser(undefined);
      expect(result).toBeNull();
    });

    it("creates user and upserts stream user when user does not exist", async () => {
      mockFindOne.mockResolvedValue(null);
      const createdUser = {
        _id: "new-id",
        clerkId: "dev-alice",
        name: "Alice",
        email: "alice@example.com",
        role: "student",
      };
      mockCreate.mockResolvedValue(createdUser);
      mockUpsertStreamUser.mockResolvedValue(undefined);

      const devAuth = {
        clerkId: "dev-alice",
        name: "Alice",
        email: "alice@example.com",
        profileImage: "",
        role: "student",
      };

      const result = await findOrCreateDevUser(devAuth);

      expect(mockFindOne).toHaveBeenCalledWith({
        $or: [{ clerkId: "dev-alice" }, { email: "alice@example.com" }],
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          clerkId: "dev-alice",
          name: "Alice",
          email: "alice@example.com",
          role: "student",
          onboardingCompleted: true,
        }),
      );
      expect(mockUpsertStreamUser).toHaveBeenCalledWith({
        id: "dev-alice",
        name: "Alice",
        image: "",
      });
      expect(result).toEqual(createdUser);
    });

    it("updates existing user when found and upserts stream user", async () => {
      const existingUser = {
        _id: "existing-id",
        clerkId: "dev-bob",
        name: "Old Name",
        email: "old@example.com",
        role: "student",
        onboardingCompleted: false,
        save: mockSave,
      };
      mockFindOne.mockResolvedValue(existingUser);
      mockSave.mockResolvedValue(undefined);
      mockUpsertStreamUser.mockResolvedValue(undefined);

      const devAuth = {
        clerkId: "dev-bob",
        name: "Bob Updated",
        email: "bob@example.com",
        profileImage: "http://img.example.com/bob.jpg",
        role: "teacher",
      };

      const result = await findOrCreateDevUser(devAuth);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(existingUser.name).toBe("Bob Updated");
      expect(existingUser.email).toBe("bob@example.com");
      expect(existingUser.role).toBe("teacher");
      expect(existingUser.onboardingCompleted).toBe(true);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockUpsertStreamUser).toHaveBeenCalledWith({
        id: "dev-bob",
        name: "Bob Updated",
        image: "http://img.example.com/bob.jpg",
      });
      expect(result).toBe(existingUser);
    });

    it("preserves existing name when devAuth name is empty", async () => {
      const existingUser = {
        _id: "id",
        name: "Preserved Name",
        email: "user@example.com",
        clerkId: "dev-user",
        role: "student",
        onboardingCompleted: true,
        save: mockSave,
      };
      mockFindOne.mockResolvedValue(existingUser);
      mockSave.mockResolvedValue(undefined);
      mockUpsertStreamUser.mockResolvedValue(undefined);

      const devAuth = {
        clerkId: "dev-user",
        name: "",
        email: "user@example.com",
        profileImage: "",
        role: "student",
      };

      await findOrCreateDevUser(devAuth);
      expect(existingUser.name).toBe("Preserved Name");
    });

    it("does not set onboardingCompleted again if already true", async () => {
      const existingUser = {
        _id: "id",
        name: "Name",
        email: "e@example.com",
        clerkId: "dev-u",
        role: "student",
        onboardingCompleted: true,
        save: mockSave,
      };
      mockFindOne.mockResolvedValue(existingUser);
      mockSave.mockResolvedValue(undefined);
      mockUpsertStreamUser.mockResolvedValue(undefined);

      const devAuth = {
        clerkId: "dev-u",
        name: "Name",
        email: "e@example.com",
        profileImage: "",
        role: "student",
      };

      await findOrCreateDevUser(devAuth);
      // onboardingCompleted was already true, should remain true
      expect(existingUser.onboardingCompleted).toBe(true);
    });
  });
});