import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  ExchangePwOtpBody,
  ListPwAnnouncementsParams,
  ListPwAnnouncementsResponse,
  ListPwBatchesResponse,
  ListPwDppParams,
  ListPwDppResponse,
  ListPwNotesParams,
  ListPwNotesResponse,
  ListPwSubjectsParams,
  ListPwSubjectsResponse,
  ListPwTopicsParams,
  ListPwTopicsResponse,
  RequestPwOtpBody,
  VerifyPwTokenBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PW_API = "https://api.penpencil.co";
const ORGANIZATION_ID = "5eb393ee95fab7468a79d189";
const CLIENT_ID = "system-admin";
const CLIENT_SECRET = "KjPXuAVfC5xbmgreETNMaL7z";
const REFERER = "https://www.pw.live/";

type JsonRecord = Record<string, unknown>;

type PwResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object"
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function errorMessage(body: unknown, fallback: string): string {
  const root = asRecord(body);
  const error = asRecord(root.error);
  return (
    asString(error.message) ||
    asString(root.message) ||
    fallback
  );
}

function authHeaders(token?: string, integrationWith = "Origin"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Client-Id": ORGANIZATION_ID,
    "Client-Type": "WEB",
    "Client-Version": "2.6.15",
    Origin: "https://www.pw.live",
    Referer: REFERER,
    "Integration-With": integrationWith,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    Randomid: randomUUID(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function pwRequest(
  path: string,
  init: RequestInit = {},
  token?: string,
  integrationWith = "Origin",
): Promise<PwResponse> {
  try {
    const response = await fetch(`${PW_API}${path}`, {
      ...init,
      headers: {
        ...authHeaders(token, integrationWith),
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text };
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      body: {
        message: error instanceof Error ? error.message : "PW API unavailable",
      },
    };
  }
}

function jsonBody(value: unknown): RequestInit {
  return {
    method: "POST",
    body: JSON.stringify(value),
  };
}

function tokenFromRequest(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function requireToken(req: Request, res: Response): string | null {
  const token = tokenFromRequest(req);
  if (!token) {
    res.status(401).json({
      success: false,
      errorMessage: "A PW session token is required.",
    });
  }
  return token;
}

function remoteList(body: unknown): JsonRecord[] {
  const root = asRecord(body);
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(body)
      ? body
      : [];
  return list.map(asRecord);
}

function resourceGroups(body: unknown) {
  const groups: Array<{
    topic: string | null;
    attachments: Array<{ id: string | null; name: string; url: string }>;
  }> = [];

  for (const entry of remoteList(body)) {
    const homework = Array.isArray(entry.homeworkIds)
      ? entry.homeworkIds
      : [];
    for (const item of homework.map(asRecord)) {
      const attachments = Array.isArray(item.attachmentIds)
        ? item.attachmentIds
        : [];
      groups.push({
        topic: asNullableString(item.topic),
        attachments: attachments.map((attachment) => {
          const file = asRecord(attachment);
          const baseUrl = asString(file.baseUrl).replace(/\/+$/, "");
          const key = asString(file.key).replace(/^\/+/, "");
          return {
            id: asNullableString(file._id),
            name: asString(file.name, "Study material"),
            url: baseUrl && key ? `${baseUrl}/${key}` : baseUrl || key,
          };
        }),
      });
    }
  }
  return groups;
}

function attachment(value: unknown) {
  const file = asRecord(value);
  const baseUrl = asString(file.baseUrl).replace(/\/+$/, "");
  const key = asString(file.key).replace(/^\/+/, "");
  if (!baseUrl && !key) {
    return null;
  }
  return {
    id: asNullableString(file._id),
    name: asString(file.name, "Attachment"),
    url: baseUrl && key ? `${baseUrl}/${key}` : baseUrl || key,
  };
}

function handleRemoteError(res: Response, response: PwResponse): void {
  res.status(response.status === 401 || response.status === 403 ? 401 : 502).json({
    success: false,
    errorMessage: errorMessage(response.body, "PW returned an error."),
  });
}

router.post("/pw/auth/verify", async (req, res) => {
  const parsed = VerifyPwTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ valid: false, errorMessage: "Enter a session token." });
    return;
  }

  const response = await pwRequest(
    "/v3/oauth/verify-token",
    { method: "POST" },
    parsed.data.token,
  );
  const body = asRecord(response.body);
  const data = asRecord(body.data);
  res.json({
    valid: Boolean(response.ok && body.success && data.isVerified),
    errorMessage: response.ok ? null : errorMessage(body, "Token verification failed."),
  });
});

router.post("/pw/auth/otp", async (req, res) => {
  const parsed = RequestPwOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, errorMessage: "Enter a valid phone number." });
    return;
  }

  const payload = {
    username: parsed.data.phone,
    countryCode: parsed.data.countryCode,
    organizationId: ORGANIZATION_ID,
  };
  let response = await pwRequest(
    "/v1/users/get-otp?smsType=0",
    jsonBody(payload),
  );
  // PW has used both SMS modes in production; retry with the current fallback
  // when the first mode is rejected by the upstream service.
  if (!response.ok) {
    response = await pwRequest(
      "/v1/users/get-otp?smsType=1",
      jsonBody(payload),
    );
  }
  const body = asRecord(response.body);
  const success = response.ok && (body.success === undefined || Boolean(body.success));
  res.status(success ? 200 : response.status >= 400 && response.status < 500 ? response.status : 502).json({
    success,
    errorMessage: success ? null : errorMessage(body, "Could not send OTP."),
  });
});

router.post("/pw/auth/token", async (req, res) => {
  const parsed = ExchangePwOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, errorMessage: "Enter your phone number and OTP." });
    return;
  }

  const response = await pwRequest(
    "/v3/oauth/token",
    jsonBody({
      username: parsed.data.phone,
      otp: parsed.data.otp,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "password",
      latitude: 0,
      longitude: 0,
      organizationId: ORGANIZATION_ID,
    }),
    undefined,
    "",
  );
  const body = asRecord(response.body);
  const data = asRecord(body.data);
  const accessToken = asNullableString(data.access_token);
  const success = response.ok && Boolean(accessToken);
  res.status(success ? 200 : response.status >= 400 && response.status < 500 ? response.status : 502).json({
    success,
    accessToken,
    expiresIn: asNullableNumber(data.expires_in),
    errorMessage: success ? null : errorMessage(body, "Could not verify OTP."),
  });
});

router.get("/pw/batches", async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return;
  const response = await pwRequest(
    "/batch-service/v1/batches/purchased-batches?amount=paid&page=1&type=ALL",
    {},
    token,
  );
  if (!response.ok) {
    handleRemoteError(res, response);
    return;
  }
  const batches = remoteList(response.body).map((batch) => ({
    id: asNullableString(batch._id),
    name: asString(batch.name, "Untitled batch"),
    slug: asString(batch.slug),
    startDate: asNullableString(batch.startDate),
    endDate: asNullableString(batch.endDate),
    expiryDate: asNullableString(batch.expiryDate),
  }));
  res.json(ListPwBatchesResponse.parse(batches));
});

router.get("/pw/batches/:batchSlug/subjects", async (req, res) => {
  const params = ListPwSubjectsParams.safeParse(req.params);
  const token = requireToken(req, res);
  if (!token) return;
  if (!params.success) {
    res.status(400).json({ success: false, errorMessage: "Invalid batch." });
    return;
  }
  const response = await pwRequest(
    `/v3/batches/${encodeURIComponent(params.data.batchSlug)}/details`,
    {},
    token,
  );
  if (!response.ok) {
    handleRemoteError(res, response);
    return;
  }
  const details = asRecord(asRecord(response.body).data);
  const subjects = Array.isArray(details.subjects) ? details.subjects : [];
  res.json(
    ListPwSubjectsResponse.parse(
      subjects.map((item) => {
        const subject = asRecord(item);
        return {
          id: asNullableString(subject._id),
          name: asString(subject.subject, "Untitled subject"),
          slug: asString(subject.slug),
          lectureCount: asNullableNumber(subject.lectureCount),
        };
      }),
    ),
  );
});

router.get("/pw/batches/:batchSlug/subjects/:subjectSlug/topics", async (req, res) => {
  const params = ListPwTopicsParams.safeParse(req.params);
  const token = requireToken(req, res);
  if (!token) return;
  if (!params.success) {
    res.status(400).json({ success: false, errorMessage: "Invalid subject." });
    return;
  }
  const response = await pwRequest(
    `/v2/batches/${encodeURIComponent(params.data.batchSlug)}/subject/${encodeURIComponent(params.data.subjectSlug)}/topics?page=1`,
    {},
    token,
  );
  if (!response.ok) {
    handleRemoteError(res, response);
    return;
  }
  res.json(
    ListPwTopicsResponse.parse(
      remoteList(response.body).map((item) => ({
        id: asNullableString(item._id),
        name: asString(item.name, "Untitled topic"),
        slug: asString(item.slug),
      })),
    ),
  );
});

async function listResources(
  req: Request,
  res: Response,
  contentType: "notes" | "DppNotes",
): Promise<void> {
  const parser =
    contentType === "notes" ? ListPwNotesParams : ListPwDppParams;
  const parsed = parser.safeParse(req.params);
  const token = requireToken(req, res);
  if (!token) return;
  if (!parsed.success) {
    res.status(400).json({ success: false, errorMessage: "Invalid topic." });
    return;
  }
  const { batchSlug, subjectSlug, topicSlug } = parsed.data;
  const response = await pwRequest(
    `/v2/batches/${encodeURIComponent(batchSlug)}/subject/${encodeURIComponent(subjectSlug)}/contents?page=1&contentType=${contentType}&tag=${encodeURIComponent(topicSlug)}`,
    {},
    token,
  );
  if (!response.ok) {
    handleRemoteError(res, response);
    return;
  }
  const groups = resourceGroups(response.body);
  res.json(
    contentType === "notes"
      ? ListPwNotesResponse.parse(groups)
      : ListPwDppResponse.parse(groups),
  );
}

router.get(
  "/pw/batches/:batchSlug/subjects/:subjectSlug/topics/:topicSlug/notes",
  (req, res) => void listResources(req, res, "notes"),
);
router.get(
  "/pw/batches/:batchSlug/subjects/:subjectSlug/topics/:topicSlug/dpp",
  (req, res) => void listResources(req, res, "DppNotes"),
);

router.get("/pw/batches/:batchId/announcements", async (req, res) => {
  const params = ListPwAnnouncementsParams.safeParse(req.params);
  const token = requireToken(req, res);
  if (!token) return;
  if (!params.success) {
    res.status(400).json({ success: false, errorMessage: "Invalid batch." });
    return;
  }
  const response = await pwRequest(
    `/v1/batches/${encodeURIComponent(params.data.batchId)}/announcement?page=1`,
    {},
    token,
  );
  if (!response.ok) {
    handleRemoteError(res, response);
    return;
  }
  const announcements = remoteList(response.body).map((item) => ({
    id: asNullableString(item._id),
    announcement: asString(item.announcement, "Announcement"),
    scheduleTime: asNullableString(item.scheduleTime),
    attachment: attachment(item.attachment),
  }));
  res.json(ListPwAnnouncementsResponse.parse(announcements));
});

export default router;