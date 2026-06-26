import serverless from "serverless-http";
import { createApp } from "../../server/src/app.js";

let handlerPromise;

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = createApp().then((app) => serverless(app));
  }
  return handlerPromise;
}

export const handler = async (event, context) => {
  const serverlessHandler = await getHandler();
  return serverlessHandler(event, context);
};
