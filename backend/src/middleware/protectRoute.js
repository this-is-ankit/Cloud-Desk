import { clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";
import { extractDevAuthHeaders, findOrCreateDevUser } from "../lib/devAuth.js";

export const protectRoute = async (req, res, next) => {
  try {
    const devAuth = extractDevAuthHeaders(req.headers);
    if (devAuth) {
      const user = await findOrCreateDevUser(devAuth);
      req.user = user;
      return next();
    }

    const clerkId = req.auth?.().userId;
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized - invalid token" });
    }

    let user = await User.findOne({ clerkId });
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const name =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const image = clerkUser.imageUrl;

    if (!user) {
      try {
        user = await User.create({
          clerkId,
          name,
          email,
          profileImage: image,
        });

        await upsertStreamUser({
          id: clerkId,
          name,
          image,
        });
      } catch (dbError) {
        console.error("Error creating user in protectRoute:", dbError);
        user = await User.findOne({ clerkId });

        if (!user) {
          return res
            .status(500)
            .json({ message: "Failed to sync user account" });
        }
      }
    } else {
      user.name = name || user.name;
      user.email = email || user.email;
      user.profileImage = image || user.profileImage;
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
