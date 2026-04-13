import { normalizeSessionLanguage } from "./sessionLanguage.js";

const LANGUAGE_BY_EXTENSION = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  rs: "rust",
  go: "go",
  md: "markdown",
  json: "json",
  html: "html",
  css: "css",
  txt: "plaintext",
};

const toFile = (path, content, language) => ({
  path,
  content,
  language,
});

export const inferLanguageFromPath = (path, fallback = "plaintext") => {
  const extension = path.split(".").pop()?.toLowerCase?.() || "";
  return LANGUAGE_BY_EXTENSION[extension] || fallback;
};

export const buildWorkspaceTemplate = ({
  language,
  title = "Cloud Desk Lesson",
  role = "student",
}) => {
  const normalizedLanguage = normalizeSessionLanguage(language);
  const commonFiles = [
    toFile(
      "README.md",
      `# ${title}\n\nThis classroom workspace was provisioned for the ${role}.\nUse follow mode to stay in sync with the teacher, or detach to experiment safely.\n`,
      "markdown",
    ),
    toFile(
      ".cloud-desk/config.json",
      JSON.stringify(
        {
          provider: "mock",
          role,
          lessonRoot: "/workspace",
          syncMode: "files-only",
        },
        null,
        2,
      ),
      "json",
    ),
  ];

  if (normalizedLanguage === "python") {
    return {
      templateId: "python-classroom",
      activeFilePath: "src/main.py",
      files: [
        ...commonFiles,
        toFile(
          "src/main.py",
          'def greet(name: str) -> None:\n    print(f"Hello, {name}!")\n\n\nif __name__ == "__main__":\n    greet("Cloud Desk")\n',
          "python",
        ),
      ],
    };
  }

  if (normalizedLanguage === "java") {
    return {
      templateId: "java-classroom",
      activeFilePath: "src/Main.java",
      files: [
        ...commonFiles,
        toFile(
          "src/Main.java",
          'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Cloud Desk!");\n  }\n}\n',
          "java",
        ),
      ],
    };
  }

  if (normalizedLanguage === "cpp") {
    return {
      templateId: "cpp-classroom",
      activeFilePath: "src/main.cpp",
      files: [
        ...commonFiles,
        toFile(
          "src/main.cpp",
          '#include <iostream>\n\nint main() {\n  std::cout << "Hello, Cloud Desk!" << std::endl;\n  return 0;\n}\n',
          "cpp",
        ),
      ],
    };
  }

  if (normalizedLanguage === "c") {
    return {
      templateId: "c-classroom",
      activeFilePath: "src/main.c",
      files: [
        ...commonFiles,
        toFile(
          "src/main.c",
          '#include <stdio.h>\n\nint main(void) {\n  printf("Hello, Cloud Desk!\\n");\n  return 0;\n}\n',
          "c",
        ),
      ],
    };
  }

  if (normalizedLanguage === "rust") {
    return {
      templateId: "rust-classroom",
      activeFilePath: "src/main.rs",
      files: [
        ...commonFiles,
        toFile(
          "src/main.rs",
          'fn main() {\n    println!("Hello, Cloud Desk!");\n}\n',
          "rust",
        ),
      ],
    };
  }

  if (normalizedLanguage === "go") {
    return {
      templateId: "go-classroom",
      activeFilePath: "src/main.go",
      files: [
        ...commonFiles,
        toFile(
          "src/main.go",
          'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, Cloud Desk!")\n}\n',
          "go",
        ),
      ],
    };
  }

  return {
    templateId: "javascript-classroom",
    activeFilePath: "src/index.js",
    files: [
      ...commonFiles,
      toFile(
        "package.json",
        JSON.stringify(
          {
            name: "cloud-desk-lesson",
            private: true,
            scripts: {
              start: "node src/index.js",
            },
          },
          null,
          2,
        ),
        "json",
      ),
      toFile(
        "src/index.js",
        'function greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n\ngreet("Cloud Desk");\n',
        "javascript",
      ),
    ],
  };
};
