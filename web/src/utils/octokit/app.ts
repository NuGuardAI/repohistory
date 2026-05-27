import { App } from "octokit";

let appInstance: App | undefined;

export function getApp(): App {
  if (appInstance) {
    return appInstance;
  }

  const appId = process.env.APP_ID;
  const privateKey = process.env.APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('Missing GitHub App credentials: APP_ID and APP_PRIVATE_KEY are required');
  }

  appInstance = new App({
    appId,
    privateKey,
  });

  return appInstance;
}

