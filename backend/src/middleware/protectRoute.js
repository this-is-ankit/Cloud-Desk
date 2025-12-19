import { clerkClient, requireAuth } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js"; // Import Stream sync function

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized - invalid token" });
      }

      // 1. Try to find the user in our database
      let user = await User.findOne({ clerkId });

      // 2. If user is not found in DB, sync them from Clerk immediately
      if (!user) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          
          const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
          const email = clerkUser.emailAddresses[0]?.emailAddress;
          const image = clerkUser.imageUrl;

          // Create in MongoDB
          user = await User.create({
            clerkId: clerkId,
            name,
            email,
            profileImage: image,
          });

          // Sync with Stream (Video/Chat) Backend
          await upsertStreamUser({
            id: clerkId,
            name,
            image,
          });

        } catch (dbError) {
           console.error("Error creating user in protectRoute:", dbError);
           // Retry logic for race conditions
           user = await User.findOne({ clerkId });
           
           if (!user) {
             return res.status(500).json({ message: "Failed to sync user account" });
           }
        }
      }

      // 3. Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];