import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "./email.provider";
import { sendZaloZNS } from "./zalo.provider";
import { getTemplate } from "./templates";
import type { NotificationEvent } from "@/types/enums";

export interface NotifyOptions {
  userId: string;
  phone?: string;
  email?: string | null;
  event: NotificationEvent;
  templateData: Record<string, string>;
}

/**
 * Gửi thông báo bất đồng bộ (email + Zalo). Tự động lookup phone/email nếu không truyền.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  let phone = opts.phone;
  let email = opts.email;

  // Tra cứu user nếu thiếu phone HOẶC thiếu email → email luôn được điền để nhánh
  // email (KYC/withdrawal/broadcast) thực sự chạy, kể cả khi caller chỉ truyền phone.
  if (!phone || email === undefined || email === null) {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { phone: true, email: true },
    });
    phone = phone ?? user?.phone ?? "";
    email = email ?? user?.email ?? null;
  }

  const template = getTemplate(opts.event);

  await Promise.allSettled([
    email ? notifyEmail({ ...opts, email, phone: phone! }, template) : Promise.resolve(),
    phone ? notifyZalo({ ...opts, phone, email }, template) : Promise.resolve(),
  ]);
}

/**
 * Gửi cho nhiều user cùng lúc (broadcast cho tất cả hành khách trong trip).
 */
export async function notifyMany(
  userIds: string[],
  event: NotificationEvent,
  templateData: Record<string, string>,
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => notify({ userId, event, templateData })),
  );
}

async function notifyEmail(
  opts: Required<Pick<NotifyOptions, "userId" | "email" | "event" | "templateData">> & { phone: string },
  template: ReturnType<typeof getTemplate>,
) {
  if (!opts.email || !template.subject) return;

  const log = await prisma.notificationLog.create({
    data: {
      userId: opts.userId,
      event: opts.event,
      channel: "EMAIL",
      status: "PENDING",
      payload: { to: opts.email, ...opts.templateData },
    },
  });

  try {
    const msgId = await sendEmail({
      to: opts.email,
      subject: template.subject,
      html: template.emailHtml(opts.templateData),
    });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT", providerMsgId: msgId },
    });
  } catch {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", retryCount: { increment: 1 } },
    });
  }
}

async function notifyZalo(
  opts: NotifyOptions & { phone: string },
  template: ReturnType<typeof getTemplate>,
) {
  if (!template.zaloTemplateId || !opts.phone) return;

  const log = await prisma.notificationLog.create({
    data: {
      userId: opts.userId,
      event: opts.event,
      channel: "ZALO",
      status: "PENDING",
      payload: { phone: opts.phone, ...opts.templateData },
    },
  });

  try {
    const msgId = await sendZaloZNS({
      phone: opts.phone,
      templateId: template.zaloTemplateId,
      templateData: template.zaloData(opts.templateData),
    });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT", providerMsgId: msgId },
    });
  } catch {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", retryCount: { increment: 1 } },
    });
  }
}
