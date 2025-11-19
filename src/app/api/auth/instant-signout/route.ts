import { signOut } from "@/auth";

const redirectTo = "/";

export async function GET (): Promise<void> {
  await signOut( { redirectTo } );
}

export async function POST (): Promise<void> {
  await signOut( { redirectTo } );
}
