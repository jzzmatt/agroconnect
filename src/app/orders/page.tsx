"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Package, Wrench } from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { buildCourseLearnPath } from "@/lib/academy/course-navigation";
import { getCustomerOrdersAction } from "@/lib/services/commerce-actions";
import { listMyEnrolledCoursesAction } from "@/lib/services/course-actions";
import { getCustomerRequestsAction } from "@/lib/services/marketplace-actions";
import type { EnrolledCourseListItem } from "@/types/agriacademy";
import type { OrderDescriptor } from "@/types/commerce";
import type { ServiceRequestItem } from "@/types/agriexpert";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type PurchaseTab = "orders" | "courses" | "services";

const dateLocale: Record<Locale, string> = {
  pt: "pt-AO",
  en: "en-GB",
  fr: "fr",
};

function formatDate(value: string, locale: Locale) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(dateLocale[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency: string, locale: Locale) {
  return `${new Intl.NumberFormat(dateLocale[locale]).format(amount)} ${currency}`;
}

function knownLabel(map: Record<string, string>, value: string) {
  return map[value] ?? value;
}

export default function OrdersPage() {
  const { dict, locale } = useI18n();
  const copy = dict.purchases;
  const tablistId = useId();
  const [tab, setTab] = useState<PurchaseTab>("orders");
  const [orders, setOrders] = useState<OrderDescriptor[]>([]);
  const [courses, setCourses] = useState<EnrolledCourseListItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCustomerOrdersAction().catch(() => [] as OrderDescriptor[]),
      listMyEnrolledCoursesAction().catch(() => [] as EnrolledCourseListItem[]),
      getCustomerRequestsAction().catch(() => [] as ServiceRequestItem[]),
    ]).then(([nextOrders, nextCourses, nextRequests]) => {
      if (cancelled) return;
      setOrders(nextOrders);
      setCourses(nextCourses);
      setRequests(nextRequests);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs: Array<{ id: PurchaseTab; label: string; count: number }> = [
    { id: "orders", label: copy.tabOrders, count: orders.length },
    { id: "courses", label: copy.tabCourses, count: courses.length },
    { id: "services", label: copy.tabServices, count: requests.length },
  ];

  const selectTab = (next: PurchaseTab) => setTab(next);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;
    setTab(next.id);
    document.getElementById(`${tablistId}-${next.id}`)?.focus();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">{dict.navigation.myPurchases}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </header>

        <div
          id={tablistId}
          role="tablist"
          aria-label={dict.navigation.myPurchases}
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
        >
          {tabs.map((item, index) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                id={`${tablistId}-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tablistId}-panel`}
                tabIndex={selected ? 0 : -1}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "border-border bg-surface-card text-muted-foreground"
                )}
                onClick={() => selectTab(item.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                {item.label}
                {isLoading ? "" : ` (${item.count})`}
              </button>
            );
          })}
        </div>

        <div id={`${tablistId}-panel`} role="tabpanel" aria-labelledby={`${tablistId}-${tab}`} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{copy.loading}</p>
          ) : tab === "orders" ? (
            <OrderList orders={orders} locale={locale} />
          ) : tab === "courses" ? (
            <CourseList courses={courses} locale={locale} />
          ) : (
            <ServiceList requests={requests} locale={locale} />
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}

function OrderList({ orders, locale }: { orders: OrderDescriptor[]; locale: Locale }) {
  const { dict } = useI18n();
  const copy = dict.purchases;
  if (orders.length === 0) {
    return (
      <EmptyPurchase
        icon={Package}
        title={copy.emptyOrdersTitle}
        description={copy.emptyOrdersDescription}
        href="/agrishopping"
        action={copy.browseProducts}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const paymentStatus = knownLabel(copy.paymentStatus, order.payment?.status ?? order.payment_status);
        const paymentMethod = order.payment ? knownLabel(copy.paymentMethod, order.payment.payment_method) : null;
        const paymentAmount = order.payment
          ? formatMoney(order.payment.amount, order.payment.currency, locale)
          : formatMoney(order.total, order.currency, locale);
        return (
          <li key={order.id} className="rounded-2xl border border-border bg-surface-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
                {knownLabel(copy.orderStatus, order.status)}
              </span>
              <span className="font-mono text-xs font-bold text-primary">{order.order_number}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(order.created_at, locale)}</p>
            <ul className="mt-2 space-y-1">
              {order.items.slice(0, 2).map((item) => (
                <li key={item.id} className="text-sm font-bold text-foreground">
                  {item.quantity}× {item.product_title}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {order.fulfillment_method === "delivery" ? copy.delivery : copy.pickup}
              {" · "}
              {copy.total}: {formatMoney(order.total, order.currency, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.payment}: {paymentStatus}
              {paymentMethod ? ` · ${paymentMethod}` : ""}
              {" · "}
              {paymentAmount}
            </p>
            <Link href={`/orders/${order.order_number}`} className="mt-3 block">
              <Button variant="primary" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                <span>{copy.viewOrder}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CourseList({ courses, locale }: { courses: EnrolledCourseListItem[]; locale: Locale }) {
  const { dict } = useI18n();
  const copy = dict.purchases;
  if (courses.length === 0) {
    return (
      <EmptyPurchase
        icon={BookOpenCheck}
        title={copy.emptyCoursesTitle}
        description={copy.emptyCoursesDescription}
        href="/agriacademy"
        action={copy.browseCourses}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {courses.map((item) => {
        const available = item.course.status === "published" && Boolean(item.course.slug);
        return (
          <li key={item.enrollmentId} className="rounded-2xl border border-border bg-surface-card p-4">
            <h2 className="text-sm font-black text-foreground">{item.course.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {dict.agriacademy.enrolledOn}: {formatDate(item.enrolledAt, locale)}
            </p>
            {available ? (
              <Link href={buildCourseLearnPath(item.course.slug, item.lastLessonId)} className="mt-3 block">
                <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                  <span>{dict.agriacademy.continueCourse}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </Button>
              </Link>
            ) : (
              <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400">{copy.unavailableCourse}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ServiceList({ requests, locale }: { requests: ServiceRequestItem[]; locale: Locale }) {
  const { dict } = useI18n();
  const copy = dict.purchases;
  if (requests.length === 0) {
    return (
      <EmptyPurchase
        icon={Wrench}
        title={copy.emptyServicesTitle}
        description={copy.emptyServicesDescription}
        href="/agriservice"
        action={copy.browseServices}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id} className="rounded-2xl border border-border bg-surface-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
              {knownLabel(copy.requestStatus, request.status)}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-black text-foreground">
            {request.service_title || dict.navigation.agriService}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(request.created_at, locale)}</p>
          {request.requested_date ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.requestedOn}: {formatDate(request.requested_date, locale)}
            </p>
          ) : null}
          {request.estimated_price != null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.total}: {formatMoney(request.estimated_price, request.currency, locale)}
            </p>
          ) : null}
          {request.service_slug ? (
            <Link href={`/services/${request.service_slug}`} className="mt-3 block">
              <Button variant="outline" size="sm" className="h-10 w-full justify-between text-xs font-bold">
                <span>{copy.viewService}</span>
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
              </Button>
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function EmptyPurchase({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
      <Icon className="mx-auto h-6 w-6 text-primary" aria-hidden />
      <h2 className="mt-3 text-base font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Link href={href} className="mt-4 inline-block">
        <Button variant="primary" size="sm" className="font-bold">
          {action}
        </Button>
      </Link>
    </div>
  );
}
