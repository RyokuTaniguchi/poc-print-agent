import { FormEvent, useEffect, useRef, useState } from "react";

const BASE_URL_PREFIX = "https://xxx.com/x/";
const INITIAL_PREVIEW_MESSAGE =
  "テンプレート、日付、URL、UUID をすべて入力すると、ここにラベル画像を表示します。";

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

const templateOptions: TemplateOption[] = [
  {
    id: "template-12x15",
    label: "12mm テンプレート (12×15)",
    path: buildPublicAssetPath("template_12×15.lw1"),
    tape: TAPE_IDS._12MMTAPE
  },
  {
    id: "template-18x21",
    label: "18mm テンプレート (18×21)",
    path: buildPublicAssetPath("template_18×21.lw1"),
    tape: TAPE_IDS._18MMTAPE
  },
  {
    id: "template-24x21",
    label: "24mm テンプレート (24×21)",
    path: buildPublicAssetPath("template_24×21.lw1"),
    tape: TAPE_IDS._24MMTAPE
  }
];

export default function App() {
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [rawDate, setRawDate] = useState("");
  const [uuid, setUuid] = useState("");
  const [printerStatus, setPrinterStatus] = useState("");
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [isTepraAvailable, setIsTepraAvailable] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewMessage, setPreviewMessage] = useState(INITIAL_PREVIEW_MESSAGE);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const statusLogRef = useRef<HTMLDivElement | null>(null);
  const templatePreviewCacheRef = useRef(new Map<string, string>());

  const trimmedUuid = uuid.trim();
  const url = `${BASE_URL_PREFIX}${trimmedUuid}`;
  const selectedTemplate =
    templateOptions.find((option) => option.id === selectedTemplateId) ?? null;
  const previewReady = Boolean(selectedTemplate && rawDate.trim() && trimmedUuid);
  const previewDate = formatJapaneseDate(rawDate) ?? rawDate;

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

    if (!rawDate.trim() || !trimmedUuid) {
      appendStatus("日付 / UUID をすべて入力してください。");
      return;
    }

    const datatime = formatJapaneseDate(rawDate);
    if (!datatime) {
      appendStatus("日付の形式が正しくありません。カレンダーから日付を選択してください。");
      return;
    }

    if (!selectedTemplate) {
      appendStatus("テンプレートを選択してください。");
      return;
    }

    setIsWorking(true);
    appendStatus("テンプレートを準備しています…");

    try {
      const selectedTemplateFile = await resolveTemplateFile(selectedTemplate);
      const csvFile = createCsvFile({
        datatime,
        url,
        uuid: trimmedUuid
      });

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

      appendStatus(`ジョブ ${printResult.printJob.jobId} を送信しました。進捗を確認します。`);
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
            <label htmlFor="datetime-input">日付</label>
            <input
              id="datetime-input"
              type="date"
              value={rawDate}
              onChange={(event) => setRawDate(event.target.value)}
              disabled={isWorking}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="url-input">URL</label>
            <input id="url-input" type="url" value={url} readOnly disabled={isWorking} required />
          </div>

          <div className="field">
            <label htmlFor="uuid-input">UUID</label>
            <input
              id="uuid-input"
              type="text"
              value={uuid}
              onChange={(event) => setUuid(event.target.value)}
              placeholder="t-20250000001"
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
                  <dt>日付</dt>
                  <dd>{previewDate || "-"}</dd>
                </div>
                <div>
                  <dt>URL</dt>
                  <dd>{url || "-"}</dd>
                </div>
                <div>
                  <dt>UUID</dt>
                  <dd>{trimmedUuid || "-"}</dd>
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

function createCsvFile({
  datatime,
  url,
  uuid
}: {
  datatime: string;
  url: string;
  uuid: string;
}) {
  const header = ["datatime", "url", "uuid"];
  const row = [datatime, url, uuid];
  const csvContent = `${header.join(",")}\n${row.map(escapeCsv).join(",")}\n`;

  return new File([csvContent], `label-data-${Date.now()}.csv`, {
    type: "text/csv",
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

function formatJapaneseDate(rawDate: string) {
  const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch;
  return `${year}年${month}月${day}日`;
}

function preparePrintParameter(printParameter: TepraPrintParameter, tapeId: number) {
  return {
    ...printParameter,
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
