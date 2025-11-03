import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";

// ✅ Define auth options
export const authOptions: NextAuthOptions = {
  providers: [
    // 🔹 Manual login (email + password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<typeof users.$inferSelect | null> {
        if (!credentials?.email || !credentials?.password) return null;

        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1)
          .then((r) => r[0]);

        if (!existingUser || !existingUser.password) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          existingUser.password
        );

        if (!valid) return null;

        return existingUser;
      },
    }),

    // 🔹 Google Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    // 🔹 Facebook Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    }),
  ],

  // ✅ Callbacks
  callbacks: {
    async signIn(params: {
      user: import("next-auth").User;
      account: import("next-auth").Account | null;
      profile?: import("next-auth").Profile;
      email?: { verificationRequest?: boolean };
      credentials?: Record<string, unknown>;
    }): Promise<boolean> {
      const { user, account } = params;
      if (!user?.email) return false;

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
        .then((r) => r[0]);

      if (!existingUser) {
        await db.insert(users).values({
          name: user.name || null,
          email: user.email,
          provider: account?.provider || "credentials",
          provider_id: account?.providerAccountId || null,
          image: user.image || null,
        });
      } else {
        await db
          .update(users)
          .set({
            name: user.name || existingUser.name,
            image: user.image || existingUser.image,
            provider: account?.provider || existingUser.provider,
          })
          .where(eq(users.email, user.email));
      }

      return true;
    },

    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: import("next-auth").User;
    }): Promise<JWT> {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({
      session,
      token,
    }: {
      session: import("next-auth").Session;
      token: JWT;
    }): Promise<import("next-auth").Session> {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

// ✅ Export API handlers
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
