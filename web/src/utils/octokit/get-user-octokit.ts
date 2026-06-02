import { Octokit } from "octokit";
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function getUserOctokit(): Promise<Octokit> {
  const session = await auth();

  if (!session?.accessToken) {
    redirect('/signin');
  }

  return new Octokit({
    auth: session.accessToken
  });
}