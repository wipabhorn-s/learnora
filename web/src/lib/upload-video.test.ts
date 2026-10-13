import { uploadVideo } from "@/lib/upload-video";
import { afterEach, describe, expect, it, vi } from "vitest";

const ticket = {
  uploadUrl: "https://api.cloudinary.com/v1_1/demo/video/upload",
  fields: { api_key: "123", signature: "sig", public_id: "lessons/u/v" },
};
const file = new File(["video-bytes"], "intro.mp4", { type: "video/mp4" });

/** XMLHttpRequest ปลอม: เก็บสิ่งที่ถูกส่ง แล้วให้เทสต์สั่งผลลัพธ์เอง */
class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress?: (event: Partial<ProgressEvent>) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  responseType = "";
  status = 0;
  response: unknown = null;
  method = "";
  url = "";
  body?: FormData;

  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send(body: FormData) {
    this.body = body;
  }
  finish(status: number, response: unknown) {
    this.status = status;
    this.response = response;
    this.onload?.();
  }
}

const start = (onProgress = vi.fn()) => {
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  const promise = uploadVideo(ticket, file, onProgress);
  return { promise, xhr: FakeXhr.last, onProgress };
};

describe("uploadVideo (browser → Cloudinary, not through our server)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the signed fields and the file, then returns the public id", async () => {
    const { promise, xhr } = start();

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe(ticket.uploadUrl);
    expect(xhr.body?.get("signature")).toBe("sig");
    expect(xhr.body?.get("public_id")).toBe("lessons/u/v");
    expect((xhr.body?.get("file") as File).name).toBe("intro.mp4");

    xhr.finish(200, { public_id: "lessons/u/v" });
    await expect(promise).resolves.toBe("lessons/u/v");
  });

  it("reports progress as a percentage", () => {
    const { xhr, onProgress } = start();

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });

    expect(onProgress.mock.calls).toEqual([[25]]);
  });

  it("surfaces Cloudinary's reason when the upload is refused", async () => {
    const { promise, xhr } = start();

    xhr.finish(400, { error: { message: "Unsupported video format or file" } });

    await expect(promise).rejects.toThrow("Unsupported video format or file");
  });

  it("explains a dropped connection", async () => {
    const { promise, xhr } = start();

    xhr.onerror?.();

    await expect(promise).rejects.toThrow("Could not reach the upload server");
  });
});
