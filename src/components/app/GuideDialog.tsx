/**
 * 사용 가이드 창: 교사가 실제로 하는 순서대로 적습니다.
 * 짜임새는 어울림 사용 가이드와 같습니다 (brand/DESIGN.md).
 */

import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { privacyNote } from "../../core/updates";
import { primaryButton } from "../buttonStyles";
import { MadeBy } from "./MadeBy";
import { ModalDialog } from "./ModalDialog";
import { UpdateSection } from "./Updates";
import type { Updates } from "./useUpdates";

// 오래 읽는 창이라 본문 16px, 진한 색으로 씁니다 (brand/DESIGN.md).
const STRONG = "font-bold";
const BODY = "text-emph leading-[26px] text-ink";
const SECTION = `${BODY} flex flex-col gap-1.5`;
const HEADING = "text-title-sm font-bold text-ink";
const KEY = "rounded-[4px] border border-b-2 border-hairline bg-canvas px-[5px] py-[3px] font-[inherit] text-body font-normal";

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-4">
      <span className="flex-shrink-0 self-start w-10 rounded-[7px] bg-tint py-[7px] text-center text-body font-semibold text-accent">
        {number}
      </span>
      <div className={`${SECTION} min-w-0 flex-1`}>
        <h3 className={HEADING}>{title}</h3>
        {children}
      </div>
    </section>
  );
}

function Shortcut({ keyName, children }: { keyName: string; children: ReactNode }) {
  return (
    <span className={BODY}>
      <kbd className={KEY}>{keyName}</kbd> {children}
    </span>
  );
}

export function GuideDialog({
  appVersion,
  status,
  updates,
  onDownloadTemplate,
  onClose,
}: {
  appVersion: string | null;
  status: ReactNode;
  updates: Updates;
  onDownloadTemplate: () => void;
  onClose: () => void;
}) {
  return (
    <ModalDialog labelledBy="guide-title" widthClass="w-[760px]" onClose={onClose}>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h2 id="guide-title" className="text-title font-bold">
              스코어쇼 사용 가이드
            </h2>
            <p className={BODY}>점수 파일을 넣고 학생에게 한 명씩 보여 주는 순서입니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-input text-soft transition-colors hover:bg-surface-hover hover:text-ink"
            aria-label="사용 가이드 닫기"
          >
            <X size={20} />
          </button>
        </div>

        {status}

        <section className="rounded-card bg-wash p-5 text-emph leading-[26px] text-ink flex flex-col gap-1.5">
          <h3 className={HEADING}>시작하기 전에</h3>
          <p>
            <strong className={STRONG}>TV와 프로젝터를 끄거나 연결을 해제해 주세요.</strong> 연결된 채로 열면 학생
            점수가 교실 화면에 보일 수 있습니다.
          </p>
        </section>

        <Step number="01" title="나이스에서 점수 파일 받기">
          <p>교과담임 → 수행평가조회/통계 → 수행평가조회로 들어가, 아래 중 하나를 고릅니다.</p>
          <ul className="ml-4 list-disc">
            <li>교과목별일람표조회-강의실별</li>
            <li>강의실별일람표조회-전체영역</li>
          </ul>
          <p>조회를 누른 뒤 저장 아이콘을 눌러 xls 형식으로 받습니다.</p>
        </Step>

        <Step number="02" title="스코어쇼에 넣기">
          <p>
            받은 파일을 끌어다 놓거나 파일 선택을 누르고, 이름을 정해 저장합니다. 저장한 목록은 다음에 켤 때 왼쪽에서
            고를 수 있어, 파일을 다시 넣지 않아도 다른 반으로 바로 옮겨 갈 수 있습니다.
          </p>
        </Step>

        <Step number="03" title="점수 확인하기">
          <p>
            <strong className={STRONG}>점수 수정</strong>을 누르면 반 전체 점수가 표로 나옵니다. 학생 수와 영역, 점수가
            맞는지 보고 틀린 점수는 바로 고칩니다. 학생이 오기 전에 수정을 마쳐 주세요.
          </p>
        </Step>

        <Step number="04" title="학생에게 보여 주기">
          <ol className="ml-4 list-decimal">
            <li>대기 화면에서 학생 한 명을 불러, 모니터 앞으로 오게 합니다.</li>
            <li>선생님이 오른쪽 화살표 키를 누르면 그 학생의 점수가 나옵니다.</li>
            <li>학생이 점수를 확인합니다.</li>
            <li>
              선생님이 오른쪽 화살표 키를 한 번 더 누르면 대기 화면이 됩니다. 학생은 자리로 돌아가고, 다음 학생이 나옵니다.
            </li>
          </ol>
          <p>이렇게 하면 다음 학생은 앞 학생의 점수를 볼 수 없습니다. 오지 않은 학생은 왼쪽 명단에서 이름을 눌러 나중에 보여 줍니다.</p>
        </Step>

        <Step number="05" title="끝난 뒤">
          <p>
            학생들이 모두 확인했다면 <strong className={STRONG}>저장된 점수를 지워 주세요.</strong> 지우지 않으면 이
            컴퓨터에서 스코어쇼를 여는 사람은 누구나 점수를 볼 수 있습니다. 나중에 실수로 앱을 켜거나, 다음에 이 컴퓨터를
            쓰는 분이 열어 볼 수도 있습니다. 아직 확인하지 못한 학생이 있으면 그 반은 남겨 두었다가, 확인이 끝난 뒤 지우면
            됩니다.
          </p>
          <p>
            목록 하나는 목록 옆의 휴지통이나 목록을 연 뒤 <strong className={STRONG}>이 목록 삭제</strong>로 지웁니다.
            목록이 둘 이상이면 처음 화면의 목록 아래 <strong className={STRONG}>모두 지우기</strong>로 한꺼번에 지울 수
            있습니다.
          </p>
        </Step>

        <div className="flex flex-wrap gap-x-6 gap-y-4 border-y border-line py-[18px]">
          <Shortcut keyName="←">앞 학생</Shortcut>
          <Shortcut keyName="→">뒤 학생</Shortcut>
          <Shortcut keyName="F">전체화면</Shortcut>
          <Shortcut keyName="Esc">대기 화면</Shortcut>
        </div>

        <section className="rounded-card border border-line p-5 text-emph leading-[26px] text-ink flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <h3 className={HEADING}>문제가 있을 때</h3>
            <p>나이스 파일에서 평가 영역이 하나만 읽히면 표준 서식에 점수를 붙여 넣어 올려 주세요.</p>
          </div>
          <button type="button" onClick={onDownloadTemplate} className={primaryButton}>
            표준 서식 받기
          </button>
        </section>

        <section className={SECTION}>
          <h3 className={HEADING}>학생 정보</h3>
          <p>{privacyNote(updates.isSupported)}</p>
        </section>

        <UpdateSection updates={updates} bodyClass={SECTION} headingClass={HEADING} />

        <p className={BODY}>궁금한 점이나 불편한 점은 hello@gnilab.kr로 알려 주세요.</p>

        <div className="flex justify-end border-t border-line pt-[19px]">
          <button type="button" onClick={onClose} className={primaryButton}>
            확인
          </button>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-small text-soft">
          {appVersion && <span>버전 {appVersion}</span>}
          <MadeBy />
        </div>
      </div>
    </ModalDialog>
  );
}
