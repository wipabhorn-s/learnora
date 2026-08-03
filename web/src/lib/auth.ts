import { AuthApi } from "@/lib/api/auth.api";
import { loginSchema } from "@/lib/schemas/auth.schema";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt", maxAge: 86370 },
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      async authorize(input) {
        try {
          const data = loginSchema.parse(input);
          const { access_token, user } = await AuthApi.login(data);
          return { ...user, access_token };
        } catch {
          return null;
        }
      },
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "google" && account.id_token) {
        const { access_token, user: u } = await AuthApi.loginWithGoogle(
          account.id_token,
        );
        token.sub = u.id;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
        token.email = u.email;
        token.role = u.role;
        token.avatarUrl = u.avatarUrl;
        token.access_token = access_token;
        return token;
      }

      if (user) {
        token.sub = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.access_token = user.access_token;
      }

      if (trigger === "update" && session?.user) {
        if (session.user.firstName) {
          token.firstName = session.user.firstName;
        }

        if (session.user.lastName) {
          token.lastName = session.user.lastName;
        }

        if (session.user.avatarUrl !== undefined) {
          token.avatarUrl = session.user.avatarUrl;
        }
      }

      return token;
    },

    session({ token, session }) {
      session.user.id = token.sub;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      session.user.email = token.email;
      session.user.role = token.role;
      session.user.avatarUrl = token.avatarUrl;
      session.user.access_token = token.access_token;
      return session;
    },
  },
});
