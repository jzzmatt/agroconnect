import { describe, it, expect } from "vitest";
import * as DomainTypes from "@/types/domain";
import * as RootTypes from "@/types/index";
import * as IdentityTypes from "@/types/identity";
import * as AuthTypes from "@/types/authorization";
import * as LocalizationTypes from "@/types/localization";
import * as ExpertTypes from "@/types/agriexpert";
import * as ShoppingTypes from "@/types/agrishopping";
import * as AcademyTypes from "@/types/agriacademy";
import * as CommerceTypes from "@/types/commerce";
import * as MediaTypes from "@/types/media";
import * as NotificationTypes from "@/types/notifications";
import * as Services from "@/lib/services";
import * as Products from "@/lib/products";

describe("Phase 2 — Foundation Architecture Contracts", () => {
  it("exports all domain types from domain.ts and root index.ts for backward compatibility", () => {
    expect(DomainTypes).toBeDefined();
    expect(RootTypes).toBeDefined();
  });

  it("exports domain modular type structures correctly", () => {
    expect(IdentityTypes).toBeDefined();
    expect(AuthTypes).toBeDefined();
    expect(LocalizationTypes).toBeDefined();
    expect(ExpertTypes).toBeDefined();
    expect(ShoppingTypes).toBeDefined();
    expect(AcademyTypes).toBeDefined();
    expect(CommerceTypes).toBeDefined();
    expect(MediaTypes).toBeDefined();
    expect(NotificationTypes).toBeDefined();
  });

  it("exports canonical services through @/lib/services", () => {
    expect(Services.ShoppingService).toBeDefined();
    expect(Services.MarketplaceService).toBeDefined();
    expect(Services.CommerceService).toBeDefined();
    expect(Services.LogisticsService).toBeDefined();
    expect(Services.NotificationService).toBeDefined();
    expect(Services.ProductMediaService).toBeDefined();
    expect(Services.ProductVideoService).toBeDefined();
    expect(Services.AcademyVideoService).toBeDefined();
    expect(Services.SUBSCRIPTION_PLANS).toBeDefined();
    expect(Services.getUserEntitlements).toBeDefined();
  });

  it("exports product pipeline operations through @/lib/products", () => {
    expect(Products.createPublishedProduct).toBeDefined();
    expect(Products.validateProductVideo).toBeDefined();
    expect(Products.compressImageFile).toBeDefined();
    expect(Products.buildProductMetadata).toBeDefined();
    expect(Products.reconcileProductVideoStatus).toBeDefined();
  });
});
