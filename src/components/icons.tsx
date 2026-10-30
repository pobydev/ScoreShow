/**
 * 화면에서 함께 쓰는 선 아이콘
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function StrokeIcon({
  d,
  strokeWidth = 2,
  ...props
}: IconProps & { d: string }) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d={d}
      />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return <StrokeIcon d="M6 18L18 6M6 6l12 12" {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <StrokeIcon d="M9 5l7 7-7 7" {...props} />;
}

export function ChevronLeftIcon(props: IconProps) {
  return <StrokeIcon d="M15 19l-7-7 7-7" {...props} />;
}

export function VideoIcon(props: IconProps) {
  return (
    <StrokeIcon
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      {...props}
    />
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <StrokeIcon
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      {...props}
    />
  );
}

export function BookIcon(props: IconProps) {
  return (
    <StrokeIcon
      strokeWidth={1.5}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      {...props}
    />
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <StrokeIcon
      strokeWidth={1.5}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      {...props}
    />
  );
}
