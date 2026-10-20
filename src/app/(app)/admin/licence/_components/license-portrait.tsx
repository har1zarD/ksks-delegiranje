"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState, type CSSProperties } from "react";

const FRAME = "relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-panel-2 ring-1 ring-inset ring-line";

export function LicensePortrait({ src, name }: { src: string | null; name: string }) {
  return (
    <div className={FRAME}>
      {src ? <PortraitImage key={src} src={src} name={name} /> : <MissingPortrait />}
    </div>
  );
}

function MissingPortrait() {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-2 px-2 text-fg-faint">
      <UserRound className="size-9" strokeWidth={1.25} aria-hidden="true" />
      <span className="text-center text-[11px]">Bez fotografije</span>
    </span>
  );
}

function PortraitImage({ src, name }: { src: string; name: string }) {
  const [crop, setCrop] = useState<CSSProperties>();
  const [direct, setDirect] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return <MissingPortrait />;

  return (
    <Image
      key={direct ? "direct" : "cors"}
      src={src}
      alt={name}
      width={480}
      height={600}
      unoptimized
      crossOrigin={direct ? undefined : "anonymous"}
      loading="lazy"
      className="absolute left-0 top-0 h-full w-full max-w-none object-cover object-[50%_30%]"
      style={crop}
      onLoad={(event) => {
        if (!direct) setCrop(portraitCrop(event.currentTarget));
      }}
      onError={() => {
        if (direct) setFailed(true);
        else setDirect(true);
      }}
    />
  );
}

function portraitCrop(image: HTMLImageElement): CSSProperties | undefined {
  try {
    const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const blank = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return data[i + 3] < 24 || (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240);
    };
    const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    if (!corners.every(([x, y]) => blank(x, y))) return;

    const rows = new Uint16Array(height);
    const columns = new Uint16Array(width);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!blank(x, y)) {
          rows[y]++;
          columns[x]++;
        }
      }
    }
    const rowThreshold = Math.max(2, Math.ceil(width * 0.01));
    const columnThreshold = Math.max(2, Math.ceil(height * 0.01));
    let left = 0, top = 0, right = width - 1, bottom = height - 1;
    while (left < right && columns[left] < columnThreshold) left++;
    while (right > left && columns[right] < columnThreshold) right--;
    while (top < bottom && rows[top] < rowThreshold) top++;
    while (bottom > top && rows[bottom] < rowThreshold) bottom--;
    if (right - left < 8 || bottom - top < 8) return;
    left = Math.max(0, left - 1);
    top = Math.max(0, top - 1);
    right = Math.min(width - 1, right + 1);
    bottom = Math.min(height - 1, bottom + 1);
    const cropWidth = right - left + 1;
    const cropHeight = bottom - top + 1;
    if (cropWidth * cropHeight > width * height * 0.85) return;

    const ratio = 4 / 5;
    const cover = Math.max(ratio / cropWidth, 1 / cropHeight);
    return {
      width: `${width * cover / ratio * 100}%`,
      height: `${height * cover * 100}%`,
      left: `${((ratio - cropWidth * cover) / 2 - left * cover) / ratio * 100}%`,
      top: `${((1 - cropHeight * cover) * 0.3 - top * cover) * 100}%`,
    };
  } catch {
    return;
  }
}
