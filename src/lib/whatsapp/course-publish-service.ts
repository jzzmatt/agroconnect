import { lessonDemoVideoUrl } from "@/lib/academy/lesson-demo";
import { isWhatsappGroupId } from "@/lib/integrations/waapi/groups";
import { coursePageUrl, buildCourseCompletionMessage } from "@/lib/whatsapp/course-message";
import { PUBLICATION_WINDOW_MS, rollupPublicationStatus } from "@/lib/whatsapp/publish-service";
import { WhatsappServiceError, type PublicGroup } from "@/lib/whatsapp/types";

export type CourseShareStatus = "pending" | "processing" | "sent" | "failed" | "partially_sent";
export type CourseShareTargetStatus = "pending" | "processing" | "sent" | "failed";

export interface CourseShareTarget {
  id: string;
  groupId: string;
  groupName: string;
  status: CourseShareTargetStatus;
  providerMessageId: string | null;
  errorCode: string | null;
  sentAt: string | null;
}

export interface CourseShareRecord {
  id: string;
  userId: string;
  courseId: string;
  connectionId: string;
  clientRequestId: string;
  status: CourseShareStatus;
  createdAt: string;
  targets: CourseShareTarget[];
}

export interface ShareableCourse {
  id: string;
  ownerUserId: string;
  title: string;
  slug: string;
  instructorName: string | null;
  price: number;
  currency: string;
  status: string;
  priceConfirmed: boolean;
  demoShareCode?: string | null;
}

export interface CourseShareConnection {
  id: string;
  userId: string;
  instanceId: string;
  status: string;
  phone: string | null;
}

export interface CourseShareStore {
  findConnection(userId: string): Promise<CourseShareConnection | null>;
  listSavedGroups(connectionId: string): Promise<PublicGroup[]>;
  findCourse(courseId: string): Promise<ShareableCourse | null>;
  findPublicationByRequest(userId: string, clientRequestId: string): Promise<CourseShareRecord | null>;
  latestPublicationAt(userId: string): Promise<string | null>;
  insertPublication(input: {
    userId: string;
    courseId: string;
    connectionId: string;
    clientRequestId: string;
    groups: Array<{ id: string; name: string }>;
  }): Promise<CourseShareRecord | "duplicate">;
  saveTarget(publicationId: string, target: CourseShareTarget): Promise<void>;
  savePublicationStatus(publicationId: string, status: CourseShareStatus): Promise<void>;
  claimForRetry(userId: string, publicationId: string): Promise<boolean>;
  findPublication(userId: string, publicationId: string): Promise<CourseShareRecord | null>;
  audit(entry: {
    actorProfileId: string;
    action: string;
    entityId: string;
    metadata?: Record<string, string>;
  }): Promise<void>;
}

export interface CourseTextSender {
  sendText(instanceId: string, chatId: string, message: string): Promise<{ messageId: string | null }>;
}

function assertOwnedGroups(saved: PublicGroup[], requested: string[]) {
  const unique = [...new Set(requested)];
  if (unique.length === 0 || unique.length > 30) {
    throw new WhatsappServiceError("INVALID_GROUP", 400);
  }
  const allowed = new Map(saved.filter((group) => group.saved).map((group) => [group.id, group.name]));
  return unique.map((id) => {
    if (!isWhatsappGroupId(id) || !allowed.has(id)) {
      throw new WhatsappServiceError("GROUP_NOT_FOUND", 404);
    }
    return { id, name: allowed.get(id) || "Grupo" };
  });
}

function requireShareableCourse(course: ShareableCourse | null, userId: string): ShareableCourse {
  if (!course || course.ownerUserId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
  if (course.status !== "published" || !course.priceConfirmed) {
    throw new WhatsappServiceError("NOT_PUBLISHED", 409);
  }
  return course;
}

export function courseCompletionMessage(origin: string, course: ShareableCourse): string {
  return buildCourseCompletionMessage({
    title: course.title,
    instructorName: course.instructorName,
    price: course.price,
    currency: course.currency,
    courseUrl: coursePageUrl(origin, course.slug),
    demoVideoUrl: lessonDemoVideoUrl(origin, course.demoShareCode),
  });
}

export function createCoursePublishService(deps: {
  store: CourseShareStore;
  sender: CourseTextSender;
  origin: string;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  async function runTargets(publication: CourseShareRecord, course: ShareableCourse, connection: CourseShareConnection) {
    const message = courseCompletionMessage(deps.origin, course);
    const next: CourseShareTarget[] = [];
    for (const target of publication.targets) {
      if (target.status === "sent") {
        next.push(target);
        continue;
      }
      const processing = { ...target, status: "processing" as const };
      await deps.store.saveTarget(publication.id, processing);
      try {
        const sent = await deps.sender.sendText(connection.instanceId, target.groupId, message);
        const done: CourseShareTarget = {
          ...processing,
          status: "sent",
          providerMessageId: sent.messageId,
          errorCode: null,
          sentAt: now().toISOString(),
        };
        await deps.store.saveTarget(publication.id, done);
        next.push(done);
      } catch {
        const done: CourseShareTarget = {
          ...processing,
          status: "failed",
          errorCode: "TEXT_FAILED",
        };
        await deps.store.saveTarget(publication.id, done);
        next.push(done);
      }
    }
    const status = rollupPublicationStatus(next);
    await deps.store.savePublicationStatus(publication.id, status);
    await deps.store.audit({
      actorProfileId: publication.userId,
      action: "whatsapp.course.publish",
      entityId: publication.id,
      metadata: { status, courseId: course.id },
    });
    return { ...publication, status, targets: next };
  }

  return {
    async preview(userId: string, courseId: string) {
      const course = requireShareableCourse(await deps.store.findCourse(courseId), userId);
      const connection = await deps.store.findConnection(userId);
      const groups = connection ? await deps.store.listSavedGroups(connection.id) : [];
      const courseUrl = coursePageUrl(deps.origin, course.slug);
      return {
        message: courseCompletionMessage(deps.origin, course),
        course: {
          id: course.id,
          title: course.title,
          instructorName: course.instructorName,
          price: course.price,
          currency: course.currency,
          courseUrl,
        },
        connection: connection
          ? { status: connection.status, phone: connection.phone }
          : { status: "not_connected", phone: null },
        groups: groups.filter((group) => group.saved),
      };
    },

    async publish(userId: string, input: { courseId: string; groupIds: string[]; clientRequestId: string }) {
      if (!/^[A-Za-z0-9_-]{16,80}$/.test(input.clientRequestId)) {
        throw new WhatsappServiceError("INVALID_REQUEST", 400);
      }
      const existing = await deps.store.findPublicationByRequest(userId, input.clientRequestId);
      if (existing) return existing;

      const latest = await deps.store.latestPublicationAt(userId);
      if (latest && now().getTime() - Date.parse(latest) < PUBLICATION_WINDOW_MS) {
        throw new WhatsappServiceError("RATE_LIMITED", 429, PUBLICATION_WINDOW_MS);
      }

      const connection = await deps.store.findConnection(userId);
      if (!connection || connection.userId !== userId || connection.status !== "connected") {
        throw new WhatsappServiceError("NOT_CONNECTED", 409);
      }
      const course = requireShareableCourse(await deps.store.findCourse(input.courseId), userId);
      const groups = assertOwnedGroups(await deps.store.listSavedGroups(connection.id), input.groupIds);
      const created = await deps.store.insertPublication({
        userId,
        courseId: course.id,
        connectionId: connection.id,
        clientRequestId: input.clientRequestId,
        groups,
      });
      if (created === "duplicate") {
        const raced = await deps.store.findPublicationByRequest(userId, input.clientRequestId);
        if (raced) return raced;
        throw new WhatsappServiceError("RATE_LIMITED", 429);
      }
      return runTargets(created, course, connection);
    },

    async retry(userId: string, publicationId: string) {
      const publication = await deps.store.findPublication(userId, publicationId);
      if (!publication || publication.userId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
      const connection = await deps.store.findConnection(userId);
      if (!connection || connection.id !== publication.connectionId || connection.status !== "connected") {
        throw new WhatsappServiceError("NOT_CONNECTED", 409);
      }
      const course = requireShareableCourse(await deps.store.findCourse(publication.courseId), userId);
      if (!publication.targets.some((target) => target.status === "failed")) return publication;
      const claimed = await deps.store.claimForRetry(userId, publicationId);
      if (!claimed) throw new WhatsappServiceError("RATE_LIMITED", 429, PUBLICATION_WINDOW_MS);
      return runTargets(publication, course, connection);
    },
  };
}
