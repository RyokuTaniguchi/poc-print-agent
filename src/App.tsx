import { FormEvent, useEffect, useRef, useState } from "react";

const BASE_URL_PREFIX = "https://xxx.com/x/";
const INITIAL_PREVIEW_MESSAGE =
  "テンプレート、フリー記入項目、発行枚数、QRコード番号をすべて入力すると、ここにラベル画像を表示します。";
const QR_CODE_LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const QR_CODE_NUMBER_PATTERN = /^[A-Z]-\d{2}-\d{5}$/;
const ISSUE_QUANTITY_PATTERN = /^[1-9]\d{0,4}$/;
const MAX_QR_CODE_SERIAL = 99999;

const TAPE_IDS = {
  _12MMTAPE: 261,
  _18MMTAPE: 262,
  _24MMTAPE: 263
} as const;

type TemplateOption = {
  id: string;
  label: string;
  path: string;
  tape: number;
};

type PrintRecord = {
  text: string;
  url: string;
  qrCodeNumber: string;
};

const templateOptions: TemplateOption[] = [
  {
    id: "qr-12x24",
    label: "QR 12mm テンプレート (12×24)",
    path: buildPublicAssetPath("QR12×24.lw1"),
    tape: TAPE_IDS._12MMTAPE
  },
  {
    id: "qr-18x18",
    label: "QR 18mm テンプレート (18×18)",
    path: buildPublicAssetPath("QR18×18.lw1"),
    tape: TAPE_IDS._18MMTAPE
  },
  {
    id: "qr-18x24",
    label: "QR 18mm テンプレート (18×24)",
    path: buildPublicAssetPath("QR18×24.lw1"),
    tape: TAPE_IDS._18MMTAPE
  },
  {
    id: "qr-24x24",
    label: "QR 24mm テンプレート (24×24)",
    path: buildPublicAssetPath("QR24×24.lw1"),
    tape: TAPE_IDS._24MMTAPE
  },
  {
    id: "qr-24x32",
    label: "QR 24mm テンプレート (24×32)",
    path: buildPublicAssetPath("QR24×32.lw1"),
    tape: TAPE_IDS._24MMTAPE
  }
];

export default function App() {
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [labelText, setLabelText] = useState("");
  const [qrCodeLetter, setQrCodeLetter] = useState(QR_CODE_LETTERS[0]);
  const [qrCodeDigitPair, setQrCodeDigitPair] = useState("");
  const [qrCodeStartNumber, setQrCodeStartNumber] = useState("");
  const [issueQuantity, setIssueQuantity] = useState("1");
  const [printerStatus, setPrinterStatus] = useState("");
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [isTepraAvailable, setIsTepraAvailable] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewMessage, setPreviewMessage] = useState(INITIAL_PREVIEW_MESSAGE);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const statusLogRef = useRef<HTMLDivElement | null>(null);
  const templatePreviewCacheRef = useRef(new Map<string, string>());

  const qrCodeNumber = `${qrCodeLetter}-${qrCodeDigitPair}-${qrCodeStartNumber}`;
  const isQrCodeNumberComplete = QR_CODE_NUMBER_PATTERN.test(qrCodeNumber);
  const issueCount = Number(issueQuantity);
  const isIssueQuantityValid = ISSUE_QUANTITY_PATTERN.test(issueQuantity);
  const qrCodeStartSerial = Number(qrCodeStartNumber);
  const qrCodeLastSerial =
    isQrCodeNumberComplete && isIssueQuantityValid ? qrCodeStartSerial + issueCount - 1 : null;
  const isQrCodeSerialRangeValid = qrCodeLastSerial == null || qrCodeLastSerial <= MAX_QR_CODE_SERIAL;
  const qrCodeLastNumber =
    qrCodeLastSerial == null
      ? ""
      : buildQrCodeNumber(qrCodeLetter, qrCodeDigitPair, qrCodeLastSerial);
  const plannedIssueRange =
    isQrCodeNumberComplete && isIssueQuantityValid && isQrCodeSerialRangeValid
      ? issueCount === 1
        ? qrCodeNumber
        : `${qrCodeNumber}〜${qrCodeLastNumber}`
      : "";
  const selectedTemplate =
    templateOptions.find((option) => option.id === selectedTemplateId) ?? null;
  const trimmedLabelText = labelText.trim();
  const previewReady = Boolean(
    selectedTemplate &&
      trimmedLabelText &&
      isQrCodeNumberComplete &&
      isIssueQuantityValid &&
      isQrCodeSerialRangeValid
  );

  useEffect(() => {
    statusLogRef.current?.scrollTo({
      top: statusLogRef.current.scrollHeight
    });
  }, [statusLog]);

  useEffect(() => {
    return () => {
      for (const objectUrl of templatePreviewCacheRef.current.values()) {
        URL.revokeObjectURL(objectUrl);
      }
      templatePreviewCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof TepraPrint === "undefined" || typeof TepraPrintError === "undefined") {
      appendStatus("tepraprint.js の読み込みに失敗しました。印刷機能は利用できません。");
      setPrinterStatus("印刷モジュールの API を読み込めませんでした。");
      return;
    }

    setIsTepraAvailable(true);
    void loadPrinters();
  }, []);

  useEffect(() => {
    let active = true;

    if (!previewReady) {
      setPreviewMessage(INITIAL_PREVIEW_MESSAGE);
      setPreviewImageUrl("");
      setIsPreviewVisible(false);
      return () => {
        active = false;
      };
    }

    if (!selectedTemplate) {
      setPreviewMessage("テンプレートが見つかりません。選択内容を確認してください。");
      setPreviewImageUrl("");
      setIsPreviewVisible(false);
      return () => {
        active = false;
      };
    }

    setPreviewMessage("テンプレート画像を読み込んでいます…");
    setIsPreviewVisible(false);

    void (async () => {
      try {
        const objectUrl = await getTemplatePreviewUrl(
          selectedTemplate.path,
          templatePreviewCacheRef.current
        );
        await ensurePreviewImageCanLoad(objectUrl);

        if (!active) {
          return;
        }

        setPreviewImageUrl(objectUrl);
        setIsPreviewVisible(true);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
        setPreviewMessage(`テンプレート画像を表示できませんでした: ${message}`);
        setPreviewImageUrl("");
        setIsPreviewVisible(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [previewReady, selectedTemplate]);

  async function loadPrinters() {
    if (typeof TepraPrint === "undefined" || typeof TepraPrintError === "undefined") {
      return;
    }

    setIsWorking(true);
    appendStatus("プリンターを検索しています…");

    try {
      const result = await TepraPrint.getPrinter();
      if (result.errorCode !== TepraPrintError.SUCCESS) {
        appendStatus(`プリンター取得エラー: ${result.errorCode}`);
        setPrinterStatus(`エラーコード: ${result.errorCode}`);
        return;
      }

      setPrinters(result.printers);
      if (result.printers.length === 0) {
        setPrinterStatus("対象のプリンターが見つかりません。");
      } else {
        setPrinterStatus(`${result.printers.length} 台のプリンターを検出しました。`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
      appendStatus(`プリンターの取得に失敗しました: ${message}`);
      setPrinterStatus("プリンターの取得に失敗しました。印刷モジュールが起動しているか確認してください。");
    } finally {
      setIsWorking(false);
    }
  }

  async function handlePrint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrinterStatus("");

    if (!isTepraAvailable) {
      appendStatus("印刷モジュールが利用できないため、印刷は実行できません。");
      return;
    }

    const printerName = selectedPrinter.trim();
    if (!printerName) {
      setPrinterStatus("プリンターを選択してください。");
      return;
    }

    if (!trimmedLabelText || !isQrCodeNumberComplete || !isIssueQuantityValid) {
      appendStatus("フリー記入項目 / 発行枚数 / QRコード番号をすべて入力してください。");
      return;
    }

    if (!selectedTemplate) {
      appendStatus("テンプレートを選択してください。");
      return;
    }

    if (!isQrCodeSerialRangeValid) {
      appendStatus("発行枚数を反映すると QRコード番号の5桁数字が 99999 を超えます。");
      return;
    }

    setIsWorking(true);
    appendStatus(`テンプレートと ${issueCount} 枚分の印刷データを準備しています…`);

    try {
      const selectedTemplateFile = await resolveTemplateFile(selectedTemplate);
      const printRecords = createPrintRecords({
        text: trimmedLabelText,
        letter: qrCodeLetter,
        digitPair: qrCodeDigitPair,
        startSerial: qrCodeStartSerial,
        count: issueCount
      });
      const csvFile = createCsvFile(printRecords);

      const printerResult = await TepraPrint.createPrinter(printerName);
      if (printerResult.errorCode !== TepraPrintError.SUCCESS) {
        appendStatus(`プリンター初期化に失敗しました: ${printerResult.errorCode}`);
        return;
      }

      const printParameterResult = await printerResult.printer.createPrintParameter();
      if (printParameterResult.errorCode !== TepraPrintError.SUCCESS) {
        appendStatus(`印刷パラメーター生成に失敗しました: ${printParameterResult.errorCode}`);
        return;
      }

      const printParameter = preparePrintParameter(
        printParameterResult.printParameter,
        selectedTemplateFile.tapeId
      );

      const printResult = await printerResult.printer.doPrint(printParameter, {
        templateFile: selectedTemplateFile.file,
        csvFile
      });

      if (printResult.errorCode !== TepraPrintError.SUCCESS) {
        appendStatus(`印刷要求が失敗しました: ${printResult.errorCode}`);
        return;
      }

      appendStatus(`ジョブ ${printResult.printJob.jobId} を送信しました。${issueCount} 枚分の進捗を確認します。`);
      await monitorPrintJob(printResult.printJob, appendStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
      appendStatus(`印刷処理中にエラーが発生しました: ${message}`);
      console.error(error);
    } finally {
      setIsWorking(false);
    }
  }

  function appendStatus(message: string) {
    const timestamp = new Date().toLocaleTimeString("ja-JP");
    setStatusLog((current) => [...current, `[${timestamp}] ${message}`]);
  }

  return (
    <main className="container">
      <header className="hero">
        <p className="eyebrow">POC PRINT AGENT</p>
        <h1>TEPRA ラベル印刷</h1>
        <p className="hero-copy">
          React と TypeScript へ移行した印刷フォームです。テンプレート画像の確認と、ローカル
          API 経由の印刷を同じ画面で扱います。
        </p>
      </header>

      <section className="panel">
        <form className="form-grid" onSubmit={handlePrint}>
          <div className="field">
            <label htmlFor="printer-select">プリンター</label>
            <div className="inline-group">
              <select
                id="printer-select"
                value={selectedPrinter}
                onChange={(event) => setSelectedPrinter(event.target.value)}
                disabled={isWorking || !isTepraAvailable}
                required
              >
                <option value="">-- プリンターを選択 --</option>
                {printers.map((printer) => (
                  <option key={printer} value={printer}>
                    {printer}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="secondary"
                onClick={() => void loadPrinters()}
                disabled={isWorking || !isTepraAvailable}
              >
                再読み込み
              </button>
            </div>
            <small className="hint">{printerStatus}</small>
          </div>

          <div className="field">
            <label htmlFor="template-select">テンプレート</label>
            <select
              id="template-select"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              disabled={isWorking}
              required
            >
              <option value="">-- テンプレートを選択 --</option>
              {templateOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="issue-quantity-input">発行枚数</label>
            <input
              id="issue-quantity-input"
              type="text"
              inputMode="numeric"
              pattern="[1-9]\d{0,4}"
              maxLength={5}
              value={issueQuantity}
              onChange={(event) => setIssueQuantity(toDigits(event.target.value, 5))}
              placeholder="1"
              disabled={isWorking}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="qr-code-letter-select">QRコード番号</label>
            <div className="qr-code-inputs">
              <select
                id="qr-code-letter-select"
                value={qrCodeLetter}
                onChange={(event) => setQrCodeLetter(event.target.value)}
                disabled={isWorking}
                required
              >
                {QR_CODE_LETTERS.map((letter) => (
                  <option key={letter} value={letter}>
                    {letter}
                  </option>
                ))}
              </select>
              <span className="qr-code-separator" aria-hidden="true">
                -
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{2}"
                maxLength={2}
                value={qrCodeDigitPair}
                onChange={(event) => setQrCodeDigitPair(toDigits(event.target.value, 2))}
                placeholder="25"
                aria-label="QRコード番号 2桁数字"
                disabled={isWorking}
                required
              />
              <span className="qr-code-separator" aria-hidden="true">
                -
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                value={qrCodeStartNumber}
                onChange={(event) => setQrCodeStartNumber(toDigits(event.target.value, 5))}
                placeholder="12345"
                aria-label="QRコード番号 5桁数字（開始番号）"
                disabled={isWorking}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="planned-issue-range">発行予定番号範囲</label>
            <input
              id="planned-issue-range"
              type="text"
              value={plannedIssueRange || "-"}
              readOnly
              disabled={isWorking}
            />
          </div>

          <div className="field">
            <label htmlFor="text-input">フリー記入項目</label>
            <input
              id="text-input"
              type="text"
              value={labelText}
              onChange={(event) => setLabelText(event.target.value)}
              placeholder="2025年度調査"
              disabled={isWorking}
              required
            />
          </div>

          <div className="actions">
            <button type="submit" disabled={isWorking || !isTepraAvailable}>
              印刷する
            </button>
          </div>
        </form>
      </section>

      <section className="panel" id="preview-panel">
        <div className="section-heading">
          <h2>ラベルプレビュー</h2>
          <p>テンプレート画像ベースの確認用表示です。</p>
        </div>

        {!isPreviewVisible ? (
          <div className="preview-empty" role="status" aria-live="polite">
            {previewMessage}
          </div>
        ) : (
          <div className="preview-content">
            <div className="preview-stage">
              <img
                src={previewImageUrl}
                className="preview-image"
                alt={`${selectedTemplate?.label ?? "選択中テンプレート"} のラベルプレビュー`}
              />
            </div>

            <div className="preview-details">
              <p className="preview-note">
                現在のテンプレートファイルを画像として表示しています。差し込み後の完成画像そのもの
                ではありません。
              </p>

              <dl className="preview-meta">
                <div>
                  <dt>テンプレート</dt>
                  <dd>{selectedTemplate?.label ?? "-"}</dd>
                </div>
                <div>
                  <dt>発行枚数</dt>
                  <dd>{isIssueQuantityValid ? `${issueCount} 枚` : "-"}</dd>
                </div>
                <div>
                  <dt>QRコード番号</dt>
                  <dd>{isQrCodeNumberComplete ? qrCodeNumber : "-"}</dd>
                </div>
                <div>
                  <dt>発行予定番号範囲</dt>
                  <dd>{plannedIssueRange || "-"}</dd>
                </div>
                <div>
                  <dt>フリー記入項目</dt>
                  <dd>{trimmedLabelText || "-"}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>ステータス</h2>
          <p>印刷ジョブとプリンター探索のログです。</p>
        </div>
        <div ref={statusLogRef} className="status-log" role="status" aria-live="polite">
          {statusLog.join("\n")}
        </div>
      </section>
    </main>
  );
}

function buildPublicAssetPath(fileName: string) {
  const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${baseUrl}${fileName}`;
}

async function getTemplatePreviewUrl(templatePath: string, cache: Map<string, string>) {
  const cached = cache.get(templatePath);
  if (cached) {
    return cached;
  }

  const response = await fetch(templatePath);
  if (!response.ok) {
    throw new Error(`テンプレートの読み込みに失敗しました (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(new Blob([blob], { type: "image/bmp" }));
  cache.set(templatePath, objectUrl);
  return objectUrl;
}

function ensurePreviewImageCanLoad(objectUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("ブラウザで表示できない画像形式でした。"));
    image.src = objectUrl;
  });
}

async function resolveTemplateFile(template: TemplateOption) {
  const response = await fetch(template.path);
  if (!response.ok) {
    throw new Error(`テンプレートの読み込みに失敗しました (${response.status})`);
  }

  const blob = await response.blob();
  const fileName = template.path.split("/").pop() ?? "template.lw1";
  const file = new File([blob], fileName, {
    type: "application/octet-stream",
    lastModified: Date.now()
  });

  return {
    file,
    tapeId: template.tape
  };
}

function createPrintRecords({
  text,
  letter,
  digitPair,
  startSerial,
  count
}: {
  text: string;
  letter: string;
  digitPair: string;
  startSerial: number;
  count: number;
}) {
  return Array.from({ length: count }, (_, index) => {
    const qrCodeNumber = buildQrCodeNumber(letter, digitPair, startSerial + index);
    return {
      text,
      url: `${BASE_URL_PREFIX}${qrCodeNumber}`,
      qrCodeNumber
    };
  });
}

function createCsvFile(records: PrintRecord[]) {
  const header = ["text", "url", "uuid"];
  const rows = records.map((record) =>
    [record.text, record.url, record.qrCodeNumber].map(escapeCsv).join(",")
  );
  const csvContent = `${header.join(",")}\r\n${rows.join("\r\n")}\r\n`;
  const encodedCsvContent = encodeUtf16LeWithBom(csvContent);

  return new File([encodedCsvContent], `label-data-${Date.now()}.csv`, {
    type: "text/csv;charset=utf-16le",
    lastModified: Date.now()
  });
}

function escapeCsv(value: string | null | undefined) {
  if (value == null) {
    return "";
  }

  const stringValue = String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function toDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function buildQrCodeNumber(letter: string, digitPair: string, serial: number) {
  return `${letter}-${digitPair}-${String(serial).padStart(5, "0")}`;
}

function encodeUtf16LeWithBom(value: string) {
  const bytes = new Uint8Array(2 + value.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const byteIndex = 2 + index * 2;
    bytes[byteIndex] = codeUnit & 0xff;
    bytes[byteIndex + 1] = codeUnit >> 8;
  }

  return bytes;
}

function preparePrintParameter(printParameter: TepraPrintParameter, tapeId: number) {
  return {
    ...printParameter,
    copies: 1,
    displayPrintSetting: false,
    displayTapeWidth: false,
    previewImage: false,
    priorityPrintSetting: true,
    skipRecord: true,
    tape: tapeId
  };
}

async function monitorPrintJob(printJob: TepraPrintJob, appendStatus: (message: string) => void) {
  let lastProgress = -1;
  let finished = false;

  while (!finished) {
    try {
      const status = await printJob.progressOfPrint();
      if (status.errorCode !== TepraPrintError.SUCCESS) {
        appendStatus(`進捗取得エラー: ${status.errorCode}`);
        return;
      }

      if (status.progress !== lastProgress) {
        lastProgress = status.progress;
        const pageInfo = status.totalPageCount
          ? ` (${status.pageNumber}/${status.totalPageCount} ページ)`
          : "";
        appendStatus(`印刷進捗: ${status.progress}%${pageInfo}`);
      }

      if (status.statusError !== TepraPrintStatusError.NO_ERROR) {
        appendStatus(`プリンターエラーコード: 0x${status.statusError.toString(16)}`);
      }

      if (status.jobEnd || status.canceled) {
        finished = true;
        appendStatus(status.canceled ? "ジョブがキャンセルされました。" : "印刷が完了しました。");
      } else {
        await wait(750);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
      appendStatus(`進捗監視中にエラー: ${message}`);
      return;
    }
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
