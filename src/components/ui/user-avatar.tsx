"use client";

import { useState } from "react";

type UserAvatarProps = {
  displayName: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  tone?: "brand" | "neutral";
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function UserAvatar({
  displayName,
  imageUrl,
  size = "md",
  tone = "brand",
}: UserAvatarProps) {
  const [didImageFail, setDidImageFail] = useState(false);
  const cleanedImageUrl = imageUrl?.trim();
  const shouldShowImage = Boolean(cleanedImageUrl && !didImageFail);
  const toneClassName =
    tone === "neutral"
      ? "bg-panel-soft text-text-control"
      : "bg-brand-soft text-brand";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${toneClassName} ${sizeClasses[size]}`}
      title={displayName}
    >
      {shouldShowImage ? (
        <img
          alt=""
          className="h-full w-full object-cover"
          onError={() => setDidImageFail(true)}
          src={cleanedImageUrl}
        />
      ) : (
        getInitials(displayName)
      )}
    </span>
  );
}

function getInitials(displayName: string) {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0])
    .join("");

  return initials.toUpperCase() || "?";
}
