import {
  AtpAgentFetchHandler,
  AtpAgentFetchHandlerResponse,
} from "@atproto/api";
import nodeFetch from "node-fetch";

export const NodePolyfillAtpAgentFetchHandler: AtpAgentFetchHandler = async (
  httpUri: string,
  httpMethod: string,
  httpHeaders: Record<string, string>,
  httpReqBody: any,
) => {
  const response = await nodeFetch(httpUri, {
    method: httpMethod,
    headers: httpHeaders,
    body: JSON.stringify(httpReqBody),
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Invalid response (${
        response.status
      }) message=[${await response.text()}]`,
    );
  }
  const atpResponse = {
    status: response.status,
    body: await response.json(),
  } as AtpAgentFetchHandlerResponse;
  return atpResponse;
};
