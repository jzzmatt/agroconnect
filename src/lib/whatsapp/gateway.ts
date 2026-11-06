import {
  createWaapiInstance,
  deleteWaapiInstance,
  updateWaapiWebhook,
} from "@/lib/integrations/waapi/instances";
import {
  logoutWaapiClient,
  retrieveWaapiMe,
  retrieveWaapiQr,
  retrieveWaapiStatus,
} from "@/lib/integrations/waapi/connection";
import { retrieveWaapiGroups } from "@/lib/integrations/waapi/groups";
import type { WaapiGateway } from "./types";

export function createWaapiGateway(): WaapiGateway {
  return {
    createInstance: (input) => createWaapiInstance(input),
    updateWebhook: (instanceId, webhookUrl) => updateWaapiWebhook(instanceId, webhookUrl),
    deleteInstance: (instanceId) => deleteWaapiInstance(instanceId),
    getStatus: (instanceId) => retrieveWaapiStatus(instanceId),
    getQr: (instanceId) => retrieveWaapiQr(instanceId),
    getMe: (instanceId) => retrieveWaapiMe(instanceId),
    logout: (instanceId) => logoutWaapiClient(instanceId),
    getGroups: async (instanceId) => {
      const groups = await retrieveWaapiGroups(instanceId);
      return groups.map((group) => ({
        id: group.id,
        name: group.name,
        imageUrl: group.imageUrl,
      }));
    },
  };
}
