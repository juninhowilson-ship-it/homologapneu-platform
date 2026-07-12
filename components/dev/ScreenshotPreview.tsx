import Link from "next/link";

type Props = {
  title: string;
  route: string;
};

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 800;
const THUMB_WIDTH = 320;
const SCALE = THUMB_WIDTH / FRAME_WIDTH;
const THUMB_HEIGHT = FRAME_HEIGHT * SCALE;

export default function ScreenshotPreview({ title, route }: Props) {
  return (
    <div className="w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-surface shadow">
      <div
        className="relative overflow-hidden bg-surface-muted"
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${SCALE})` }}
        >
          <iframe
            src={route}
            title={title}
            tabIndex={-1}
            loading="lazy"
            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, border: "none", pointerEvents: "none" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <span className="font-semibold">{title}</span>
        <Link href={route} className="text-sm text-brand hover:underline">
          Abrir →
        </Link>
      </div>
    </div>
  );
}
