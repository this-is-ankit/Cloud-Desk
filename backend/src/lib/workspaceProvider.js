import { randomUUID } from "crypto";

import { ENV } from "./env.js";
import { buildWorkspaceTemplate } from "./workspaceTemplates.js";

const providerType = ENV.WORKSPACE_PROVIDER || "mock";

export const getWorkspaceProviderType = () => providerType;

export const provisionWorkspace = async ({
  session,
  user,
  role,
  workspaceKind = "persistent",
}) => {
  const template = buildWorkspaceTemplate({
    language: session.language,
    title: session.title || "Cloud Desk Session",
    role,
  });

  return {
    providerType,
    providerWorkspaceId: randomUUID(),
    templateId: template.templateId,
    status: "ready",
    embedUrl:
      providerType === "mock"
        ? ""
        : `${ENV.WORKSPACE_BASE_URL || ""}/workspace/${randomUUID()}`,
    activeFilePath: template.activeFilePath,
    files: template.files.map((file) => ({
      ...file,
      updatedAt: new Date(),
    })),
    workspaceKind,
  };
};
