"use server";

import {
  ExpertDiscoveryService,
  type SearchExpertsParams,
} from "@/lib/agriservice/expert-discovery";
import type { PublishedExpertListItem } from "@/types/transport";

export async function searchPublishedExpertsAction(
  params: SearchExpertsParams = {}
): Promise<{ experts: PublishedExpertListItem[]; total: number }> {
  return ExpertDiscoveryService.searchPublishedExperts(params);
}
