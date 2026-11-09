/**
 * 새 버전 표시 두 곳: 사이드바 맨 아래 칸의 알림, 사용 가이드 창의 '새 버전' 구역
 * 학생이 앞에 있을 수 있어 창을 띄우지 않습니다. 전체화면에서는 알림을 숨깁니다(App.tsx).
 */

import { ArrowsClockwise } from "@phosphor-icons/react";
import { checkMessage, isFound, updateMessage } from "../../core/updates";
import type { FoundUpdate } from "../../core/updates";
import { secondaryButton } from "../buttonStyles";
import type { Updates } from "./useUpdates";

const NOTICE_BUTTON = "rounded-input px-2 py-1 text-small font-semibold transition-colors hover:bg-surface-hover";

function actionFor(found: FoundUpdate, updates: Updates) {
  if (found.state === "available") return { label: "설치", run: updates.download };
  if (found.state === "failed") return { label: "다시 시도", run: updates.download };
  if (found.state === "ready") return { label: "지금 다시 시작", run: updates.install };
  return null;
}

export function UpdateNotice({ updates }: { updates: Updates }) {
  const { found } = updates;
  if (!found || updates.dismissedState === found.state) return null;
  const action = actionFor(found, updates);

  return (
    <div className="flex flex-col gap-1 px-2 pb-1.5 text-small text-ink">
      <div className="flex gap-2">
        <ArrowsClockwise size={16} className="flex-shrink-0 mt-0.5 text-accent" aria-hidden="true" />
        <span role="status" data-update-notice>
          {updateMessage(found)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 pl-5">
        {action && (
          <button type="button" onClick={action.run} className={`${NOTICE_BUTTON} text-accent hover:text-accent-ink`}>
            {action.label}
          </button>
        )}
        <button type="button" onClick={updates.dismiss} className={`${NOTICE_BUTTON} text-soft hover:text-ink`}>
          {found.state === "available" ? "나중에" : "닫기"}
        </button>
      </div>
    </div>
  );
}

function CheckOnStartSwitch({ updates }: { updates: Updates }) {
  const isOn = updates.checkOnStart;
  return (
    <div className="flex items-center justify-between gap-4">
      <span id="check-on-start">켤 때 새 버전 확인</span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-labelledby="check-on-start"
        onClick={() => updates.setCheckOnStart(!isOn)}
        className={`relative flex-shrink-0 h-6 w-11 rounded-full transition-colors ${isOn ? "bg-accent" : "bg-control"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card transition-transform ${isOn ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

export function UpdateSection({
  updates,
  bodyClass,
  headingClass,
}: {
  updates: Updates;
  bodyClass: string;
  headingClass: string;
}) {
  const { status, found } = updates;
  if (!updates.isSupported) return null;
  const action = found ? actionFor(found, updates) : { label: "업데이트 확인", run: updates.check };
  const message = isFound(status) ? updateMessage(status) : updates.hasAsked ? checkMessage(status.state) : "";

  return (
    <section className={bodyClass}>
      <h3 className={headingClass}>새 버전</h3>
      <p>켤 때 GitHub에서 새 버전이 있는지 확인합니다. 이때 학생 정보는 보내지 않습니다. 컴퓨터 접속 정보(IP 주소 등)와 업데이트 도구가 만든 임의의 번호만 GitHub로 갑니다.</p>
      <CheckOnStartSwitch updates={updates} />
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {action && (
          <button
            type="button"
            onClick={action.run}
            disabled={status.state === "checking"}
            className={secondaryButton}
          >
            {action.label}
          </button>
        )}
        {message && <span role="status">{message}</span>}
      </div>
    </section>
  );
}
