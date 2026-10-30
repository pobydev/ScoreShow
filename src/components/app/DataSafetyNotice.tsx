/**
 * 데이터 안전성 및 사용 안내
 */

export function DataSafetyNotice() {
  return (
    <div className="mb-4 p-4 bg-wash border border-tint rounded-card">
      <div>
        <h3 className="text-body font-semibold text-ink mb-1">
          🔒 데이터 안전성
        </h3>
        <p className="text-small text-soft mb-1">
          업로드한 엑셀 파일의 모든 데이터는{" "}
          <strong className="font-semibold text-ink">
            이 컴퓨터에만 저장
          </strong>
          되며, 인터넷으로 전송되지 않습니다. 서버나 클라우드에
          저장되지 않아{" "}
          <strong className="font-semibold text-ink">
            개인정보가 안전하게 보호
          </strong>
          됩니다.
        </p>
        <p className="text-small text-soft mb-3">
          사용을 완료한 후에는{" "}
          <strong className="font-semibold text-ink">데이터 삭제 버튼</strong>
          을 눌러 모든 데이터를 삭제하세요.
        </p>
        <h3 className="text-body font-semibold text-ink mb-1">
          📊 엑셀 파일 다운로드 방법
        </h3>
        <p className="text-small text-soft mb-1">
          나이스(neis)에서 다음 경로로 이동한 후, 조회 버튼을 누르고
          디스켓(💾) 모양 아이콘을 눌러{" "}
          <strong className="font-semibold text-ink">xls 방식</strong>으로
          다운로드한 엑셀 파일을 업로드하세요:
        </p>
        <ul className="text-small text-soft mb-2 ml-4 list-disc">
          <li>
            교과담임 → 수행평가조회/통계 → 수행평가조회 →
            교과목별일람표조회-강의실별
          </li>
          <li>
            교과담임 → 수행평가조회/통계 → 수행평가조회 →
            강의실별일람표조회-전체영역
          </li>
        </ul>
        <p className="text-small font-semibold text-ink mt-3 px-3 py-2 rounded-button bg-card border border-hairline">
          💡 나이스 엑셀을 업로드했을때 여러 평가 영역이 하나만 인식될 때는 상단의 표준 엑셀서식을 다운받아 점수를 붙여넣어 업로드하면 모든 영역이 안정적으로 인식됩니다.
        </p>
        <p className="text-small text-soft mt-3">
          ✏️ 업로드한 점수를 직접 수정하고 싶으시면 우측 패널의 <strong className="font-semibold text-ink">"🔒 점수 잠금 해제"</strong> 버튼을 클릭하세요.
        </p>
      </div>
    </div>
  );
}
