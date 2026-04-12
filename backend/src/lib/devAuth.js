import User from "../models/User.js";
import { upsertStreamUser } from "./stream.js";
import { ENV } from "./env.js";

const normalizeRole = (value) => (value === "teacher" ? "teacher" : "student");
const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";
const buildDevClerkId = (value) => {
  const base = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9@_. -]/g, "-");
  if (!base) return "dev-student";
  return base.startsWith("dev-") ? base : `dev-${base}`;
};

export const isDevAuthEnabled = ENV.DEV_AUTH_BYPASS === "true";

const buildDevUserPayload = (source = {}) => {
  const role = normalizeRole(source.role);
  const id = normalizeText(source.id) || `dev-${role}`;
  const name =
    normalizeText(source.name) ||
    (role === "teacher" ? "Demo Teacher" : "Demo Student");
  const email = normalizeText(source.email) || `${role}@cloud-desk.dev`;
  const profileImage =
    normalizeText(source.imageUrl) || normalizeText(source.profileImage);

  return {
    clerkId: buildDevClerkId(id),
    role,
    name,
    email,
    profileImage,
  };
};

export const extractDevAuthHeaders = (headers = {}) => {
  const id = headers["x-dev-auth-id"];
  if (!id || !isDevAuthEnabled) return null;

  return buildDevUserPayload({
    id,
    role: headers["x-dev-auth-role"],
    name: headers["x-dev-auth-name"],
    email: headers["x-dev-auth-email"],
    profileImage: headers["x-dev-auth-image"],
  });
};

export const extractDevSocketAuth = (auth = {}) => {
  if (!isDevAuthEnabled || !auth?.devAuth) return null;
  return buildDevUserPayload(auth.devAuth);
};

export const findOrCreateDevUser = async (devAuth) => {
  if (!devAuth) return null;

  let user = await User.findOne({
    $or: [{ clerkId: devAuth.clerkId }, { email: devAuth.email }],
  });

  if (!user) {
    user = await User.create({
      clerkId: devAuth.clerkId,
      name: devAuth.name,
      email: devAuth.email,
      profileImage: devAuth.profileImage,
      role: devAuth.role,
      onboardingCompleted: true,
    });
  } else {
    user.clerkId = devAuth.clerkId;
    user.name = devAuth.name || user.name;
    user.email = devAuth.email || user.email;
    user.profileImage = devAuth.profileImage || user.profileImage;
    user.role = devAuth.role;
    if (!user.onboardingCompleted) user.onboardingCompleted = true;
    await user.save();
  }

  await upsertStreamUser({
    id: devAuth.clerkId,
    name: devAuth.name,
    image: devAuth.profileImage,
  });

  return user;
};
