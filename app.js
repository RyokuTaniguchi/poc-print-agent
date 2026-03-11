(() => {
    const BASE_URL_PREFIX = "https://xxx.com/x/";

    const templateOptions = [
        {
            id: "template-12x15",
            label: "12mm テンプレート (12×15)",
            path: "template_12×15.lw1",
            tape: TepraPrintTapeID._12MMTAPE
        },
        {
            id: "template-18x21",
            label: "18mm テンプレート (18×21)",
            path: "template_18×21.lw1",
            tape: TepraPrintTapeID._18MMTAPE
        },
        {
            id: "template-24x21",
            label: "24mm テンプレート (24×21)",
            path: "template_24×21.lw1",
            tape: TepraPrintTapeID._24MMTAPE
        }
    ];

    const printerSelect = document.getElementById("printer-select");
    const templateSelect = document.getElementById("template-select");
    const datatimeInput = document.getElementById("datatime-input");
    const urlInput = document.getElementById("url-input");
    const uuidInput = document.getElementById("uuid-input");
    const printForm = document.getElementById("print-form");
    const reloadPrintersButton = document.getElementById("reload-printers");
    const printButton = document.getElementById("print-button");
    const statusLog = document.getElementById("status-log");
    const printerStatus = document.getElementById("printer-status");
    const previewEmpty = document.getElementById("preview-empty");
    const previewContent = document.getElementById("preview-content");
    const previewImage = document.getElementById("preview-image");
    const previewTemplateName = document.getElementById("preview-template-name");
    const previewDate = document.getElementById("preview-date");
    const previewUrl = document.getElementById("preview-url");
    const previewUuid = document.getElementById("preview-uuid");

    const templatePreviewCache = new Map();
    let latestPreviewRequestId = 0;

    urlInput.readOnly = true;
    urlInput.value = BASE_URL_PREFIX;

    initializePreview();
    uuidInput.addEventListener("input", () => {
        const uuid = uuidInput.value.trim();
        urlInput.value = buildUrl(uuid);
        void updatePreview();
    });
    templateSelect.addEventListener("change", () => {
        void updatePreview();
    });
    datatimeInput.addEventListener("input", () => {
        void updatePreview();
    });

    if (typeof TepraPrint === "undefined" || typeof TepraPrintError === "undefined") {
        logStatus("tepraprint.js の読み込みに失敗しました。ファイルパスを確認してください。");
        return;
    }

    populateTemplates();
    loadPrinters();
    window.addEventListener("beforeunload", disposeTemplatePreviewCache);
    void updatePreview();

    reloadPrintersButton.addEventListener("click", () => {
        loadPrinters();
    });

    printForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearHint();
        await handlePrint();
    });

    async function loadPrinters() {
        setWorkingState(true, "プリンターを検索しています…");

        try {
            const result = await TepraPrint.getPrinter();
            if (result.errorCode !== TepraPrintError.SUCCESS) {
                logStatus(`プリンター取得エラー: ${result.errorCode}`);
                setPrinterStatus(`エラーコード: ${result.errorCode}`);
                return;
            }

            renderPrinters(result.printers);
            if (result.printers.length === 0) {
                setPrinterStatus("対象のプリンターが見つかりません。");
            } else {
                setPrinterStatus(`${result.printers.length} 台のプリンターを検出しました。`);
            }
        } catch (error) {
            logStatus(`プリンターの取得に失敗しました: ${error.message}`);
            setPrinterStatus("プリンターの取得に失敗しました。印刷モジュールが起動しているか確認してください。");
        } finally {
            setWorkingState(false);
        }
    }

    async function handlePrint() {
        const printerName = printerSelect.value.trim();
        if (!printerName) {
            setPrinterStatus("プリンターを選択してください。");
            return;
        }

        const rawDate = datatimeInput.value.trim();
        const uuid = uuidInput.value.trim();
        const url = buildUrl(uuid);

        urlInput.value = url;

        if (!rawDate || !uuid) {
            logStatus("日付 / UUID をすべて入力してください。");
            return;
        }

        const datatime = formatJapaneseDate(rawDate);
        if (!datatime) {
            logStatus("日付の形式が正しくありません。カレンダーから日付を選択してください。");
            return;
        }

        setWorkingState(true, "テンプレートを準備しています…");

        try {
            const selectedTemplateFile = await resolveTemplateFile();
            if (!selectedTemplateFile) {
                logStatus("テンプレートを選択してください。");
                return;
            }

            const csvFile = createCsvFile({ datatime, url, uuid });

            const printerResult = await TepraPrint.createPrinter(printerName);
            if (printerResult.errorCode !== TepraPrintError.SUCCESS) {
                logStatus(`プリンター初期化に失敗しました: ${printerResult.errorCode}`);
                return;
            }

            const printParameterResult = await printerResult.printer.createPrintParameter();
            if (printParameterResult.errorCode !== TepraPrintError.SUCCESS) {
                logStatus(`印刷パラメーター生成に失敗しました: ${printParameterResult.errorCode}`);
                return;
            }

            const printParameter = preparePrintParameter(
                printParameterResult.printParameter,
                selectedTemplateFile.tapeId
            );

            const printFile = {
                templateFile: selectedTemplateFile.file,
                csvFile
            };

            logStatus("印刷ジョブを送信しています…");
            const printResult = await printerResult.printer.doPrint(printParameter, printFile);

            if (printResult.errorCode !== TepraPrintError.SUCCESS) {
                logStatus(`印刷要求が失敗しました: ${printResult.errorCode}`);
                return;
            }

            logStatus(`ジョブ ${printResult.printJob.jobId} を送信しました。進捗を確認します。`);
            await monitorPrintJob(printResult.printJob);
        } catch (error) {
            logStatus(`印刷処理中にエラーが発生しました: ${error.message}`);
            console.error(error);
        } finally {
            setWorkingState(false);
        }
    }

    function populateTemplates() {
        templateOptions.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.id;
            opt.textContent = option.label;
            templateSelect.appendChild(opt);
        });
    }

    function renderPrinters(printers = []) {
        printerSelect.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "-- プリンターを選択 --";
        printerSelect.appendChild(placeholder);

        printers.forEach((printer) => {
            const option = document.createElement("option");
            option.value = printer;
            option.textContent = printer;
            printerSelect.appendChild(option);
        });
    }

    function initializePreview() {
        setPreviewMessage("テンプレート、日付、URL、UUID をすべて入力すると、ここにラベル画像を表示します。");
        previewContent.hidden = true;
        previewImage.removeAttribute("src");
    }

    async function updatePreview() {
        const requestId = ++latestPreviewRequestId;
        const previewData = getPreviewData();

        if (!previewData.ready) {
            initializePreview();
            return;
        }

        const templateInfo = templateOptions.find((option) => option.id === previewData.templateId);
        if (!templateInfo) {
            setPreviewMessage("テンプレートが見つかりません。選択内容を確認してください。");
            previewContent.hidden = true;
            previewImage.removeAttribute("src");
            return;
        }

        updatePreviewSummary(templateInfo, previewData);
        setPreviewMessage("テンプレート画像を読み込んでいます…");
        previewContent.hidden = true;

        try {
            const objectUrl = await getTemplatePreviewUrl(templateInfo.path);
            if (requestId !== latestPreviewRequestId) {
                return;
            }

            await ensurePreviewImageCanLoad(objectUrl);
            if (requestId !== latestPreviewRequestId) {
                return;
            }

            previewImage.src = objectUrl;
            previewImage.alt = `${templateInfo.label} のラベルプレビュー`;
            previewContent.hidden = false;
            previewEmpty.hidden = true;
        } catch (error) {
            if (requestId !== latestPreviewRequestId) {
                return;
            }

            setPreviewMessage(`テンプレート画像を表示できませんでした: ${error.message}`);
            previewContent.hidden = true;
            previewImage.removeAttribute("src");
        }
    }

    function getPreviewData() {
        const templateId = templateSelect.value.trim();
        const rawDate = datatimeInput.value.trim();
        const uuid = uuidInput.value.trim();
        const url = buildUrl(uuid);

        return {
            ready: Boolean(templateId && rawDate && uuid && url),
            templateId,
            date: formatJapaneseDate(rawDate) ?? rawDate,
            url,
            uuid
        };
    }

    function updatePreviewSummary(templateInfo, previewData) {
        previewTemplateName.textContent = templateInfo.label;
        previewDate.textContent = previewData.date;
        previewUrl.textContent = previewData.url;
        previewUuid.textContent = previewData.uuid;
    }

    async function getTemplatePreviewUrl(templatePath) {
        if (templatePreviewCache.has(templatePath)) {
            return templatePreviewCache.get(templatePath);
        }

        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`テンプレートの読み込みに失敗しました (${response.status})`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(new Blob([blob], { type: "image/bmp" }));
        templatePreviewCache.set(templatePath, objectUrl);
        return objectUrl;
    }

    function ensurePreviewImageCanLoad(objectUrl) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("ブラウザで表示できない画像形式でした。"));
            image.src = objectUrl;
        });
    }

    function disposeTemplatePreviewCache() {
        templatePreviewCache.forEach((objectUrl) => {
            URL.revokeObjectURL(objectUrl);
        });
        templatePreviewCache.clear();
    }

    async function resolveTemplateFile() {
        const selectedId = templateSelect.value;
        if (!selectedId) {
            return null;
        }

        const templateInfo = templateOptions.find((option) => option.id === selectedId);
        if (!templateInfo) {
            return null;
        }

        try {
            const response = await fetch(templateInfo.path);
            if (!response.ok) {
                throw new Error(`テンプレートの読み込みに失敗しました (${response.status})`);
            }

            const blob = await response.blob();
            const filename = templateInfo.path.split("/").pop() ?? "template.lw1";
            const file = new File([blob], filename, {
                type: "application/octet-stream",
                lastModified: Date.now()
            });

            return {
                file,
                tapeId: templateInfo.tape
            };
        } catch (error) {
            logStatus(`テンプレートの取得に失敗しました: ${error.message}`);
            throw error;
        }
    }

    function createCsvFile({ datatime, url, uuid }) {
        const header = ["datatime", "url", "uuid"];
        const row = [datatime, url, uuid];
        const csvContent = `${header.join(",")}\n${row.map(escapeCsv).join(",")}\n`;
        return new File([csvContent], `label-data-${Date.now()}.csv`, {
            type: "text/csv",
            lastModified: Date.now()
        });
    }

    function escapeCsv(value) {
        if (value == null) {
            return "";
        }

        const stringValue = String(value);
        if (/[",\r\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    }

    function buildUrl(uuid) {
        return BASE_URL_PREFIX + (uuid ?? "");
    }

    function formatJapaneseDate(rawDate) {
        const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!dateMatch) {
            return null;
        }

        const [, year, month, day] = dateMatch;
        return `${year}年${month}月${day}日`;
    }

    function preparePrintParameter(printParameter, tapeId) {
        const param = { ...printParameter };
        param.displayPrintSetting = false;
        param.displayTapeWidth = false;
        param.previewImage = false;
        param.priorityPrintSetting = true;
        // Generated CSV contains a header row, so skip it when printing.
        param.skipRecord = true;

        if (tapeId) {
            param.tape = tapeId;
        }

        return param;
    }

    async function monitorPrintJob(printJob) {
        let lastProgress = -1;
        let finished = false;

        while (!finished) {
            try {
                const status = await printJob.progressOfPrint();
                if (status.errorCode !== TepraPrintError.SUCCESS) {
                    logStatus(`進捗取得エラー: ${status.errorCode}`);
                    return;
                }

                if (status.progress !== lastProgress) {
                    lastProgress = status.progress;
                    const pageInfo = status.totalPageCount
                        ? ` (${status.pageNumber}/${status.totalPageCount} ページ)`
                        : "";
                    logStatus(`印刷進捗: ${status.progress}%${pageInfo}`);
                }

                if (status.statusError !== TepraPrintStatusError.NO_ERROR) {
                    logStatus(`プリンターエラーコード: 0x${status.statusError.toString(16)}`);
                }

                if (status.jobEnd || status.canceled) {
                    finished = true;
                    if (status.canceled) {
                        logStatus("ジョブがキャンセルされました。");
                    } else {
                        logStatus("印刷が完了しました。");
                    }
                } else {
                    await wait(750);
                }
            } catch (error) {
                logStatus(`進捗監視中にエラー: ${error.message}`);
                return;
            }
        }
    }

    function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function logStatus(message) {
        const timestamp = new Date().toLocaleTimeString();
        statusLog.textContent += `[${timestamp}] ${message}\n`;
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    function setWorkingState(isWorking, message = null) {
        const disabled = Boolean(isWorking);
        [printerSelect, templateSelect, datatimeInput, urlInput, uuidInput, printButton, reloadPrintersButton]
            .forEach((element) => {
                element.disabled = disabled;
            });

        if (message) {
            logStatus(message);
        }
    }

    function setPrinterStatus(message) {
        printerStatus.textContent = message ?? "";
    }

    function setPreviewMessage(message) {
        previewEmpty.hidden = false;
        previewEmpty.textContent = message ?? "";
    }

    function clearHint() {
        setPrinterStatus("");
    }
})();
