import { describe, it, expect } from "@jest/globals";
import {
  DEFAULT_SESSION_LANGUAGE,
  getNormalizedSessionLanguage,
  normalizeSessionLanguage,
  getSessionLanguageLabel,
} from "../lib/sessionLanguage.js";

describe("sessionLanguage", () => {
  describe("DEFAULT_SESSION_LANGUAGE", () => {
    it("defaults to javascript", () => {
      expect(DEFAULT_SESSION_LANGUAGE).toBe("javascript");
    });
  });

  describe("getNormalizedSessionLanguage", () => {
    // Canonical names
    it("returns javascript for 'javascript'", () => {
      expect(getNormalizedSessionLanguage("javascript")).toBe("javascript");
    });

    it("returns python for 'python'", () => {
      expect(getNormalizedSessionLanguage("python")).toBe("python");
    });

    it("returns java for 'java'", () => {
      expect(getNormalizedSessionLanguage("java")).toBe("java");
    });

    it("returns cpp for 'cpp'", () => {
      expect(getNormalizedSessionLanguage("cpp")).toBe("cpp");
    });

    it("returns c for 'c'", () => {
      expect(getNormalizedSessionLanguage("c")).toBe("c");
    });

    it("returns rust for 'rust'", () => {
      expect(getNormalizedSessionLanguage("rust")).toBe("rust");
    });

    it("returns go for 'go'", () => {
      expect(getNormalizedSessionLanguage("go")).toBe("go");
    });

    // Aliases
    it("normalizes 'js' alias to javascript", () => {
      expect(getNormalizedSessionLanguage("js")).toBe("javascript");
    });

    it("normalizes 'node' alias to javascript", () => {
      expect(getNormalizedSessionLanguage("node")).toBe("javascript");
    });

    it("normalizes 'nodejs' alias to javascript", () => {
      expect(getNormalizedSessionLanguage("nodejs")).toBe("javascript");
    });

    it("normalizes 'ecmascript' alias to javascript", () => {
      expect(getNormalizedSessionLanguage("ecmascript")).toBe("javascript");
    });

    it("normalizes 'py' alias to python", () => {
      expect(getNormalizedSessionLanguage("py")).toBe("python");
    });

    it("normalizes 'c++' alias to cpp", () => {
      expect(getNormalizedSessionLanguage("c++")).toBe("cpp");
    });

    it("normalizes 'cplusplus' alias to cpp", () => {
      expect(getNormalizedSessionLanguage("cplusplus")).toBe("cpp");
    });

    it("normalizes 'cxx' alias to cpp", () => {
      expect(getNormalizedSessionLanguage("cxx")).toBe("cpp");
    });

    it("normalizes 'rs' alias to rust", () => {
      expect(getNormalizedSessionLanguage("rs")).toBe("rust");
    });

    it("normalizes 'golang' alias to go", () => {
      expect(getNormalizedSessionLanguage("golang")).toBe("go");
    });

    // Case insensitivity
    it("is case-insensitive for uppercase 'JavaScript'", () => {
      expect(getNormalizedSessionLanguage("JavaScript")).toBe("javascript");
    });

    it("is case-insensitive for uppercase 'PYTHON'", () => {
      expect(getNormalizedSessionLanguage("PYTHON")).toBe("python");
    });

    it("is case-insensitive for uppercase 'JS'", () => {
      expect(getNormalizedSessionLanguage("JS")).toBe("javascript");
    });

    it("is case-insensitive for 'GoLang'", () => {
      expect(getNormalizedSessionLanguage("GoLang")).toBe("go");
    });

    // Whitespace handling
    it("strips leading/trailing whitespace", () => {
      expect(getNormalizedSessionLanguage("  javascript  ")).toBe("javascript");
    });

    it("strips internal spaces", () => {
      expect(getNormalizedSessionLanguage("java script")).toBe("javascript");
    });

    it("strips dashes", () => {
      expect(getNormalizedSessionLanguage("java-script")).toBe("javascript");
    });

    it("strips dots", () => {
      expect(getNormalizedSessionLanguage("java.script")).toBe("javascript");
    });

    it("strips underscores", () => {
      expect(getNormalizedSessionLanguage("java_script")).toBe("javascript");
    });

    // Unknown languages
    it("returns null for unknown language 'ruby'", () => {
      expect(getNormalizedSessionLanguage("ruby")).toBeNull();
    });

    it("returns null for unknown language 'swift'", () => {
      expect(getNormalizedSessionLanguage("swift")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getNormalizedSessionLanguage("")).toBeNull();
    });

    it("returns null for null input", () => {
      expect(getNormalizedSessionLanguage(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(getNormalizedSessionLanguage(undefined)).toBeNull();
    });

    it("returns null for numeric input", () => {
      expect(getNormalizedSessionLanguage(42)).toBeNull();
    });

    it("returns null for object input", () => {
      expect(getNormalizedSessionLanguage({})).toBeNull();
    });
  });

  describe("normalizeSessionLanguage", () => {
    it("returns canonical language for valid input", () => {
      expect(normalizeSessionLanguage("javascript")).toBe("javascript");
    });

    it("returns canonical language for alias input", () => {
      expect(normalizeSessionLanguage("py")).toBe("python");
    });

    it("returns default fallback for unknown language", () => {
      expect(normalizeSessionLanguage("ruby")).toBe(DEFAULT_SESSION_LANGUAGE);
    });

    it("returns default fallback for null", () => {
      expect(normalizeSessionLanguage(null)).toBe(DEFAULT_SESSION_LANGUAGE);
    });

    it("returns default fallback for empty string", () => {
      expect(normalizeSessionLanguage("")).toBe(DEFAULT_SESSION_LANGUAGE);
    });

    it("accepts custom fallback value", () => {
      expect(normalizeSessionLanguage("ruby", "python")).toBe("python");
    });

    it("custom fallback is returned for null input", () => {
      expect(normalizeSessionLanguage(null, "go")).toBe("go");
    });
  });

  describe("getSessionLanguageLabel", () => {
    it("returns JavaScript label for javascript", () => {
      expect(getSessionLanguageLabel("javascript")).toBe("JavaScript");
    });

    it("returns Python label for python", () => {
      expect(getSessionLanguageLabel("python")).toBe("Python");
    });

    it("returns Java label for java", () => {
      expect(getSessionLanguageLabel("java")).toBe("Java");
    });

    it("returns C++ label for cpp", () => {
      expect(getSessionLanguageLabel("cpp")).toBe("C++");
    });

    it("returns C label for c", () => {
      expect(getSessionLanguageLabel("c")).toBe("C");
    });

    it("returns Rust label for rust", () => {
      expect(getSessionLanguageLabel("rust")).toBe("Rust");
    });

    it("returns Go label for go", () => {
      expect(getSessionLanguageLabel("go")).toBe("Go");
    });

    it("returns JavaScript label for alias 'js'", () => {
      expect(getSessionLanguageLabel("js")).toBe("JavaScript");
    });

    it("returns Python label for alias 'py'", () => {
      expect(getSessionLanguageLabel("py")).toBe("Python");
    });

    it("returns default JavaScript label for unknown language", () => {
      expect(getSessionLanguageLabel("ruby")).toBe("JavaScript");
    });

    it("returns default JavaScript label for null", () => {
      expect(getSessionLanguageLabel(null)).toBe("JavaScript");
    });

    it("returns default JavaScript label for empty string", () => {
      expect(getSessionLanguageLabel("")).toBe("JavaScript");
    });
  });
});