/********************************************************/
/*  Tepra Web Print Javascript API                      */
/*                                                      */
/*                  Copyright 2025 KING JIM CO.,LTD.    */
/********************************************************/

"use strict";

const tepraprint_baseaddress = "http://localhost:29108"
const tepraprint_uri = `${tepraprint_baseaddress}/api/printer`
const tepraprint_js_version = "1.0.0"

/**
 * TepraPrintErrorオブジェクト
 * エラーコードを管理する
 */
const TepraPrintError = {
    /** 成功 */
    SUCCESS: 0,
    /** 指定したプリンタが対象プリンタでない */
    PRINTER_NOT_FOUND: 1,
    /** 指定したファイルがサポート外 */
    FILE_NOT_SUPPORT: 2,
    /** 指定したファイルが見つからない */
    FILE_NOT_FOUND: 3,
    /**  印刷時パラメータなど、パラメータの内容が正しくない */
    INVALID_PARAMETER: 4,
    /** 指定した印刷ジョブが存在しない */
    PRINTJOB_NOT_FOUND: 5,
    /** プリンターアクセスエラー */
    PRINTER_ACCESS_ERROR: 100,
    /**  印刷モジュールで、印刷ジョブを生成できなかった */
    PRINT_START_ERROR: 101,
    /** 印刷ジョブの操作（印刷中止など）で、Win32APIがエラーになった */
    PRINTJOB_ACCESS_ERROR: 200,
    /** WebAPIのエンドポイントにアクセスできない（サーバーダウンなど） */
    WEBAPI_REQUEST_ERROR: 201,
    /** Web通信モジュールで内部エラーが発生した */
    WEBAPI_INTERNAL_ERROR: 202,
    /** 印刷モジュールプロセスの開始に失敗した */
    PRINT_MODLE_EXEC_ERROR: 203
}

/**
 * TepraPrintTapeIDオブジェクト
 * プリンタがサポートするテープのIDを管理するオブジェクト
 * テープIDは、プリンタドライバの用紙IDと同等
 * 画像印刷で印刷するテープを指定するときに使用する
 */
const TepraPrintTapeID = {
    /** 4mmテープ */
    _04MMTAPE: 274,
    /** 6mmテープ */
    _06MMTAPE: 259,
    /** 9mmテープ */
    _09MMTAPE: 260,
    /** 12mmテープ */
    _12MMTAPE: 261,
    /** 18mmテープ */
    _18MMTAPE: 262,
    /** 24mmテープ */
    _24MMTAPE: 263,
    /** 36mmテープ */
    _36MMTAPE: 264,
    /** 24mm(ｹｰﾌﾞﾙ用) */
    _24MMCABLE: 275,
    /** 36mm(ｹｰﾌﾞﾙ用) */
    _36MMCABLE: 276,
    /** 24mm(ｲﾝﾃﾞｯｸｽ用) */
    _24MMINDEX: 277,
    /** カットラベル */
    _36MMLABEL1: 299,
    /** 50mmテープ */
    _50MMTAPE: 309,
    /** 100mmテープ */
    _100MMTAPE: 310,
    /** 宛名ラベル */
    _100MMLABEL: 311,
    /** PANDUIT 回転ﾗﾍﾞﾙ Ø3.0~4.1 */
    DC_TURNTELL01: 1559,
    /** PANDUIT 回転ﾗﾍﾞﾙ Ø4.1~5.6 */
    DC_TURNTELL02: 1560,
    /** PANDUIT 回転ﾗﾍﾞﾙ Ø5.6~7.1 */
    DC_TURNTELL03: 1561,
    /** PANDUIT 回転ﾗﾍﾞﾙ Ø7.1~9.9 */
    DC_TURNTELL04: 1562,
    /** PANDUIT ｾﾙﾌﾗﾐ Ø2.0~4.1 */
    DC_SELFLAMI01: 1659,
    /** PANDUIT ｾﾙﾌﾗﾐ Ø3.0~7.1 */
    DC_SELFLAMI02: 1660,	
    /** PANDUIT ｾﾙﾌﾗﾐ Ø4.1~8.1 */
    DC_SELFLAMI03: 1661,
    /** PANDUIT ｾﾙﾌﾗﾐ Ø6.1~12.2 */
    DC_SELFLAMI04: 1662
}

/**
 * テープカット種類 
 */
const TepraPrintTapeCut	= {
    /** ラベル毎にテープカットする */
	EACH_LABEL: 0,
    /** 印刷JOB毎にテープカットする */
	AFTER_JOB: 1,
    /** テープカットしない */
	NOT_CUT:2
}

/**
 * 印刷速度の種類
 */
const TepraPrintPrintSpeed = {
    /** 高速印刷する */
	HIGH: 0,
    /** 低速印刷する */
    LOW: 1,
    /** 中速印刷する */
	MIDDLE: 2
}

/** テープの種類 */
const TepraPrintTapeKind = {
    /** 白ラベル/カラーラベル/透明ラベル/模様ラベル/マットラベル/強粘着ラベル/キレイに剥がせるラベル/下地がかくせるラベル/アイロン転写テープ/耐熱ラベル/mtテープ */
	NORMAL:0,
    /** 転写テープ */
	TRANSFER: 1,
    /** ケーブル表示ラベル */
	CABLE: 16,
    /** インデックスラベル */
	INDEX: 17,
    /** 点字テープ */
	BRAILLE: 64,
    /** Grandテープ */
	OLEFIN: 80,
    /** Grand用宛名ラベル */
	THERMAL_PAPER: 81,
    /** カットラベル丸形 */
	DIE_CUT_CIRCLE: 96,
    /** カットラベル楕円 */
	DIR_CUT_ELLIPSE: 97,
    /** カットラベル角丸 */
	DIE_CUT_ROUNDED_CORNERS: 98,
    /** カットラベル・パンドウィット回転ラベル */
	DIE_CUT_RESERVED1: 99,
    /** カットラベル・パンドウィットセルフラミネートラベル */
	DIR_CUT_RESERVED4: 102,
    /** 熱収縮チューブ */
	HST: 112,
    /** 屋外に強いラベル */
	VINYL: 128,
    /** クリーニングテープ */
	CLEANING: 144,
    /** 備品管理ラベル */
	EQUIPMENT_MANAGEMENT: 145,
    /** りぼん */
	RIBBON: 146,
    /** マグネット */
	MAGNET: 147,
    /** 蓄光ラベル */
	LUMINOUS_LIGHT: 148,
    /** 上質紙ラベル/ クラフトラベル */
	QUALITY_PAPER: 149,
    /** アイロンラベル */
	IRON: 150,
    /** EXロングテープ */
	BR_PET: 201,
    /** その他 */
	UNKNOWN: -1
}

/**
 * テプラのエラー状態
 */
const TepraPrintStatusError = {
	/** エラーなし */
    NO_ERROR: 0x00,
    /** カッター異常（フルカッター／ハーフカッター） */
	CUTTER_ERROR: 0x01,
    /** テープ未装着 */
	NO_TAPE_CARTRIDGE: 0x06,
    /** ヘッド過熱 */
	HEAD_OVER_HEATED: 0x15,
    /** LW本体による印刷中止／打刻中止 */
	PRINTER_CANCEL: 0x20,
    /** 蓋開き */
	COVER_OPEN: 0x21,
    /** 電圧低下 */
	LOW_VOLTAGE: 0x22,
    /** 電源OFFキーによる印刷停止／打刻停止／テープ送り停止 */
	POWER_OFF_CANCEL: 0x23,
    /** テープ排紙異常 */
	TAPE_EJECT_ERROR: 0x24,
    /** テープ送り異常（モーター異常） */
	TAPE_FEED_ERROR: 0x30,
    /** インクリボンたるみ異常 */
	INK_RIBBON_SLACK: 0x40,
    /** インクリボン残量少（予約） */
	INK_RIBBON_SHORT: 0x41,
    /** テープ／ラベル終了 */
	TAPE_END: 0x42,
    /** カットラベル位置合わせ異常 */
	CUT_LABEL_ERROR: 0x43,
    /** 環境温度異常 */
	TEMPERALURE_ERROR: 0x44,
    /** 印刷パラメーター不足 */
	INSUFFICIENT_PARAMETERS: 0x45,
    /** ハーフカッターの刃未セット */
	HALF_CUTTER_BLADE_NOT_SET: 0x50,
    /** フルカッターの刃未セット */
	FULL_CUTTER_BLADE_NOT_SET: 0x51,
    /** ハーフカッターの刃外れ */
	HALF_CUTTER_BLADE_OFF: 0x52,
    /** フルカッターの刃外れ */
	FULL_CUTTER_BLADE_OFF: 0x53,
    /** 小巻蓋開き(小巻未セット) */
	WINDER_COVER_OPEN: 0x54,
    /** ビニルテープ環境温度異常 */
	VINYL_TAPE_TEMPERATURE_ERROR: 0x55,
    /** 小巻巻き取り異常（紙詰まり） */
	WINDER_ERROR: 0x56,
    /** ハーフカット全切れ */
	HALF_CUT_ALL_CUT: 0x57,
    /** ビッグロール認識異常 */
	BIGROLL_RECOGNITION_ABNORMALITY: 0x58,
    /** ビッグロール非対応 */
	BIGROLL_NON_COMPLIANT: 0x59,
    /** オートパワーオフによる印刷停止 */
	STOP_PRINTING_BY_AUTO_POWER_OFF: 0x5c,
    /** 電源変化による印刷停止 */
	STOP_PRINTING_BY_POWER_SUPPLY_CHANGE: 0x5d,
    /** 小巻機セット */
	WINDER_SET: 0x5e,
    /** 小巻機未セット */
	WINDER_NOT_SET: 0x5f,
    /** 小巻ハーフカット全切れ */
	WINDER_HALF_CUT_ALL_CUT: 0x60,
    /** ファームウェアアップデート待機中 */
	FIRMWARE_UPDATING: 0xfffffffb,
    /** 本体動作中 */
	DEVICE_USING: 0xfffffffc,
    /** 不明 */
	UNKNOWN_ERROR: 0xffffffff
}

/**
 * 流し込み枠の属性
 */
const TepraPrintImportFrameAttribute = {
    /** テキスト */
	TEXT: 0,
    /** イメージ */
	IMAGE: 1,
    /** バーコード JAN-8(EAN-8)	 */
	JAN8: 2,
    /** バーコード JAN-13(EAN-13) */
	JAN13: 3,
    /** バーコード CODE39 */
	CODE39: 4,
    /** バーコード CODE128 */
	CODE128: 5,
    /** バーコード UPC-A */
	UPCA: 6,
    /** バーコード UPC-E */
	UPCE: 7,
    /** バーコード NW-7(Codabar) */
	NW7: 8,
    /** バーコード ITF */
	ITF: 10,
    /** バーコード カスタマバーコード */
	CUSTOMBAR: 11,
    /** バーコード GS1-128(EAN-128) */
	EAN128: 12,
    /** バーコード GS1-128(定型) */
	EAN128_BUTUURYU: 13,
    /** バーコード QRコード */
	QR_CODE: 14,
    /** バーコード GS1データバー オムニディレクショナル */
	GS1_OMNI: 15,
    /** バーコード GS1データバー トランケート */
	GS1_TRUNCATED: 16,
    /** バーコード GS1データバー スタック */
	GS1_STACKED: 17,
    /** バーコード GS1データバー スタック・オムニディレクショナル */
	GS1_STACKED_OMNI: 18,
    /** バーコード GS1データバー リミテッド */
	GS1_LIMITED: 19,
    /** バーコード GS1データバー エクスパンデッド */
	GS1_EXPANDED: 20,
    /** バーコード GS1データバー エクスパンデッド・スタック */
	GS1_EXPANDED_STACKED: 21,
    /** バーコード MaxiCode */
	MAXI_CODE: 22,
    /** バーコード PDF417 */
	PDF417:23,
    /** バーコード Data Matrix */
	DATA_MATRIX: 24,
    /** バーコード マイクロQRコード */
	MICRO_QR_CODE: 25
}

/**
 * TepraPrint オブジェクト
 */
const TepraPrint = {
    /**
     * 対象プリンターリストの取得
     * @returns {object} ErrorCode: <エラーコード>, Printers: <プリンタ名の配列>
     */
    getPrinter : async function() {
        "use strict";

        var ret = {
        };

        try {
            var response = await fetch(`${tepraprint_uri}`);
            if (response.ok) {
                ret.errorCode = TepraPrintError.SUCCESS;
                const apiResult = await response.json();
                // オブジェクトの配列から文字列の配列に変換
                ret.printers = [];
                apiResult.forEach(printerObj => {
                    ret.printers.push(printerObj.printerName);
                });
            }
            else{
                const resBody = await response.json();

                if (resBody.hasOwnProperty("errcode")) {
                    ret.errorCode = resBody.errcode;
                }
                else {
                    ret.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }
        }
        catch{
            ret.errorCode = TepraPrintError.WEBAPI_REQUEST_ERROR;       
        }

        return ret;
    },
    /**
     * バージョン情報の取得
     * @returns {object} ErrorCode: <エラーコード>, 
     * webModuleVersion: <Web通信モジュールのバージョン>, 
     * printModuleVersion: <印刷モジュールのバージョン>, 
     * printerDriversVersion: <各プリンタドライバのバージョン配列>
     */
    getVersion : async function() {
        "use strict";

        const ret = {};

        try {
            const response = await fetch(`${tepraprint_uri}/version`);
            if (response.ok) {
                const resBody = await response.json();

                ret.errorCode = TepraPrintError.SUCCESS;
                ret.javaScriptVersion = tepraprint_js_version;
                ret.webModuleVersion = resBody.webApiModule;

                ret.printerDriversVersion = [];

                for (let i = 0; i < resBody.printerDrivers.length; i++) {
                    const pdver = {
                        driverName: resBody.printerDrivers[i].driverName,
                        version: resBody.printerDrivers[i].version
                    };

                    ret.printerDriversVersion.push(pdver);
                }
            }
            else {
                const resBody = await response.json();

                if (resBody.hasOwnProperty("errcode")) {
                    ret.errorCode = resBody.errcode;
                }
                else {
                    ret.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }
        }
        catch {
            ret.errorCode = TepraPrintError.WEBAPI_REQUEST_ERROR;
        }

        return ret;
    },
    /**
     * Printer オブジェクト生成
     * @param {string}  printerName プリンタ名(省略時は自動選択)
     * @returns {object} errorCode: <エラーコード>, printer: <Printer のobject>
     */
    createPrinter : async function(printerName = null) {
        var ret = {
        };

        // 省略された場合は自動選択する
        if (!printerName) {
            const result = await tepraprint_getAutoSelectPrinter_Async();
            if (result.errorCode != TepraPrintError.SUCCESS) {
                return result;
            }

            printerName = result.printerName;
        }

        try {
            if (!printerName || !printerName.trim()) {
                ret.errorCode = TepraPrintError.PRINTER_NOT_FOUND;
                return ret;
            }

            var response = await fetch(`${tepraprint_uri}/info/${encodeURIComponent(printerName)}`);
            if (response.ok) {
                const apiResult = await response.json();

                const newPrinter = {
                    /**
                     * PrintParameter オブジェクト生成
                     * @returns {object} errorCode と printParameter
                     */
                    createPrintParameter: async function() {
                        "use strict";

                        /** @type {PrintParameter} */
                        const printParameter = tepraprint_getDefaultPrintParameter();
    
                        const result = {
                            errorCode: TepraPrintError.SUCCESS,
                            printParameter: printParameter,
                        }
    
                        return result;
                    },
                    /**
                     * 印刷
                     * @param {PrintParameter} printParameter 印刷パラメータ
                     * @param {printFile} printFile 印刷ファイル
                     * @returns {{errorCode: number, printJob: PrintJob}}
                     */
                    doPrint: async function(printParameter, printFile) {
                        const result = await tepraprint_doPrint_Async(this.printerName, printParameter, printFile);
                        return result;
                    },
                    /**
                     * テープ送り
                     * @returns errorCode
                     */
                    doTapeFeed: async function() {
                        const result = await tepraprint_doTapeFeedCut_Async(this.printerName, false);
                        return result;
                    },
                    /**
                     * テープ送りカット
                     * @returns errorCode
                     */
                    doTapeCut: async function() {
                        const result = await tepraprint_doTapeFeedCut_Async(this.printerName, true);
                        return result;
                    },
                    /**
                     * 流し込み枠の取得
                     * @param {File} templateFile SPC10テンプレートファイル
                     * @returns errorCode
                     */
                    getImportFrame: async function(templateFile) {
                        const result = await tepraprint_getImportFrame_Async(templateFile);
                        return result;
                    },
                    /**
                     * 上余白と下余白と左右余白を取得
                     * @param {number} tape テープID
                     * @param {File} templateFile テンプレートファイル
                     * @returns {{errorCode: number, marginTop: number, marginBottom: number}}
                     */
                    getMargin: async function(tape, templateFile = null) {
                        const result = await tepraprint_getMargin_Async(this.printerName, tape, templateFile);
                        return result;
                    },
                    /**
                     * プリンターステータスの取得
                     * @returns {{errorCode: number, status: Status}}
                     */
                    fetchPrinterStatus: async function() {
                        const result = await tepraprint_fetchPrinterStatus_Async(this.printerName);
                        return result;
                    }

                };

                newPrinter.printerName = printerName;
                newPrinter.modelName = apiResult.driverName;
                newPrinter.resolution = apiResult.dpi;
                // tapeListからテープIDのみ取得
                var tempArray = [];
                apiResult.tapeList.forEach(tapeinfo => {
                    tempArray.push(tapeinfo.tapeID);
                });
                newPrinter.kindOfTape = tempArray;
               
                ret.errorCode = TepraPrintError.SUCCESS;
                ret.printer = newPrinter;
            }
            else {
                const apiResult = await response.json();
                if (apiResult.hasOwnProperty("errcode")) {
                    ret.errorCode = apiResult.errcode;
                }
                else { // errcodeがない = .NETでエラー処理された
                    ret.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }
        }
        catch{
            ret.errorCode = TepraPrintError.WEBAPI_REQUEST_ERROR;
        }

        return ret;
    },
    /**
     * 指定プリンタがオンラインか確認
     * @param {string} printerName プリンタ名
     * @returns {(errorCode: number, isOnline: boolean)}
     */
    checkPrinterOnline : async function(printerName) {
        "use strict";

        const ret = {};

        try {
            if (!printerName || !printerName.trim()) {
                ret.errorCode = TepraPrintError.PRINTER_NOT_FOUND;
                return ret;
            }

            const response = await fetch(`${tepraprint_uri}/onlinestatus/${encodeURIComponent(printerName)}`);
            if (response.ok) {
                const resBody = await response.json();

                ret.errorCode = TepraPrintError.SUCCESS;
                ret.isOnline = Boolean(resBody.online);
            }
            else {
                const resBody = await response.json();

                if (resBody.hasOwnProperty("errcode")) {
                    ret.errorCode = resBody.errcode;
                }
                else {
                    ret.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }
        }
        catch {
            ret.errorCode = TepraPrintError.WEBAPI_REQUEST_ERROR;
        }

        return ret;
    }
};

//------------------------------------------------------------------------
//  内部関数
//------------------------------------------------------------------------
/**
 * @typedef {object} PrintParameter - 印刷で設定するパラメータ
 * @property {number} copies - 印刷部数
 * @property {number} tapeCut - テープカット種類(TepraPrintTapeCut)
 * @property {boolean} halfCut - ハーフカット設定
 * @property {number} printSpeed - 印刷速度(TepraPrintPrintSpeed)
 * @property {number} density - 印刷濃度
 * @property {number} tape - テープID(TepraPrintTapeID)
 * @property {boolean} priorityPrintSetting - true: 印刷設定優先 / false: テープカートリッジの印刷設定
 * @property {boolean} halfCutContinuous - true:ハーフカット連続で切り離したラベルを作る / false:ハーフカット連続でつながったラベルを作る
 * @property {number} marginLeftRight - 左右余白(0.1mm単位) 0は未指定
 * @property {boolean} displayTapeWidth - テープ幅確認メッセージ表示フラグ
 * @property {boolean} displayError	- エラー表示フラグ
 * @property {boolean} displayPrintSetting - 印刷設定確認メッセージ表示フラグ
 * @property {boolean} skipRecord - CSVファイルの1行目レコードを読み飛ばしフラグ
 * @property {boolean} previewImage	- プレビュー用BMP出力
 * @property {boolean} convertFullWidth	- CSVデータの半角→全角カタカナ変換
 * @property {boolean} stretchImage - 画像拡大縮小
 */

/**
 * @typedef {object} PrintFile - 印刷ファイル指定
 * @property {File} templateFile - テンプレートファイルのフルパス
 * @property {File} csvFile - CSVファイルのフルパス
 * @property {File} imageFile - 画像ファイルのフルパス
 */

/**
 * @typedef {object} Printer
 * @property {number[]} kindOfTape - 対応しているテープIDのリスト
 * @property {string} modelName - モデル名
 * @property {number} resolution - 解像度
 * @property {string} printerName - プリンタ名
 * @property {()=>{errorCode: number, printParameter: PrintParameter}} cretePrintParameter - PrintParameterオブジェクトを作成
 * @property {(tape: number, templateFile: string)=>{errorCode: number, marginTop: number, marginBottom: number, marginLeftRight: number}} getMargin - 上余白と下余白と左右余白を取得
 * @property {(printParameter: PrintParameter, printFile: PrintFile)=>{errorCode: number, printJob: PrintJob}} doPrint - 印刷
 * @property {()=>{errorCode: number}} doTapeFeed - テープ送り
 * @property {()=>{errorCode: number}} doTapeCut - テープ送りカット
 * @property {(templateFile: string)=>{errorCode: number, importFrame: ImportFrame[]}} getImportFrame - 流し込み枠の取得
 * @property {()=>{errorCode: number, status: Status}} fetchPrinterStatus - プリンターステータスの取得
 */

/**
 * @typedef {object} PrintJob
 * @property {string} printerName - プリンタ名
 * @property {number} jobId - 印刷ジョブID
 * @property {()=>{errorCode: number, progress: number, pageNumber: number, totalPageCount: number, jobEnd: boolean, canceled: boolean, statusError: number}} progressOfPrint - データー送信進捗
 * @property {()=>{errorCode: number}} cancelPrint - 印刷中止
 * @property {()=>{errorCode: number}} resumeOfPrint - 一時停止中のジョブを再開
 * @property {()=>{errorCode: number}} pauseOfPrint - ジョブの一時停止
 * @property {()=>{errorCode: number, isPaused: boolean}} isPaused - ジョブの一時停止状態を取得
 */

/**
 * @typedef {object} Status
 * @property {number} tapeWidthFromStatus - ステータスからテープ幅を取得
 * @property {number} tapeKindFromStatus - ステータスからテープ種類を取得
 * @property {TapeSwitch} tapeSwitchFromStatus - ステータスからテープ検出状態を取得
 * @property {TapeOption} tapeOptionFromStatus - ステータスからテープオプションを取得
 * @property {number} deviceErrorFromStatus - ステータスからテプラのエラー情報を取得
 */

/**
 * @typedef {object} TapeSwitch テープ検出状態辞書
 * @property {number} magnet - マグネット（0: 非マグネット / 1: マグネット)
 * @property {number} bigroll - EXロングテープ（0: 非EXロングテープ / 1: EXロングテープ）
 */

/**
 * @typedef {object} TapeOption テープオプション辞書
 * @property {number} fullCut - フルカット（0: 許可 / 1: 禁止）
 * @property {number} halfCut - ハーフカット（0: 許可 / 1: 禁止）
 * @property {number} density - 印刷濃度（0: 通常 / 1: +3）
 * @property {number} printSpeed - 印刷速度（0: 高速 / 1: 低速 / 2: 中速）
 * @property {number} mirror - 鏡文字（0: 正像 / 1: 鏡像）
 * @property {number} winder - 巻き戻し（0: 許可 / 1: 禁止）
 */

/**
 * PrintParameterの初期値を取得
 * @returns {PrintParameter} 印刷パラメータ初期値
 */
function tepraprint_getDefaultPrintParameter() {
    "use strict";

    // 印刷パラメータ初期値
    /** @type {PrintParameter} */
    const defaultPrintParameter = {
        copies: 1,                              // 印刷部数
        tapeCut: TepraPrintTapeCut.EACH_LABEL,  // テープカットの種類
        halfCut: true,                          // ハーフカット設定
        printSpeed: TepraPrintPrintSpeed.HIGH,  // 印刷速度
        density: 0,                             // 印刷濃度
        tape: TepraPrintTapeID._18MMTAPE,       // テープID
        priorityPrintSetting: false,            // 印刷設定優先
        halfCutContinuous: false,               // ハーフカット連続
        marginLeftRight: 0,                     // 左右余白
        displayTapeWidth: true,                 // テープ幅確認メッセージ表示
        displayError: true,                     // エラー表示
        displayPrintSetting: true,              // 印刷設定確認メッセージ表示
        skipRecord: false,                      // CSVファイル１行目レコードの読み飛ばし
        previewImage: false,                    // プレビュー画像表示
        convertFullWidth: false,                // CSVデータの半角→全角カタカナ変換
        stretchImage: false                     // 画像拡大縮小
    }

    return defaultPrintParameter;
}

/**
 * PrintParameterからWebAPIに渡すPrintParameterを取得
 * @param {PrintParameter} printParameter - 印刷パラメータ
 * @returns {object} errorCode と WebAPIに渡す印刷パラメータ(requestPrintParameter)
 */
function tepraprint_getWebApiPrintParameter(printParameter) {
    "use strict";

    const result = {
        errorCode: TepraPrintError.SUCCESS,
        requestPrintParameter: {}
    };

    const reqParam = {};

    // 印刷部数
    reqParam.copies = printParameter.copies;

    // テープカット種類
    switch (printParameter.tapeCut) {
        case TepraPrintTapeCut.EACH_LABEL:  // ラベル毎にテープカットする
            reqParam.tapeCut = 2;
            break;
        case TepraPrintTapeCut.AFTER_JOB:   // 印刷JOB毎にテープカットする
            reqParam.tapeCut = 3;
            break;
        case TepraPrintTapeCut.NOT_CUT:     // テープカットしない
            reqParam.tapeCut = 1;
            break;
        default:
            result.errorCode = TepraPrintError.INVALID_PARAMETER;
            break;
    }

    // ハーフカット設定
    if (printParameter.halfCut) {
        reqParam.halfCut = 2;  // ハーフカットする
    }
    else {
        reqParam.halfCut = 1;  // ハーフカットしない
    }

    // 印刷速度
    switch (printParameter.printSpeed) {
        case TepraPrintPrintSpeed.HIGH:     // 高速印刷する
            reqParam.printSpeed = 1;
            break;
        case TepraPrintPrintSpeed.LOW:      // 低速印刷する
            reqParam.printSpeed = 2;
            break;
        case TepraPrintPrintSpeed.MIDDLE:   // 中速印刷する
            reqParam.printSpeed = 3;
            break;
        default:
            result.errorCode = TepraPrintError.INVALID_PARAMETER;
            break;
    }

    // 印刷濃度
    reqParam.density = {
        mode: 1,    // 指定する
        value: printParameter.density,
    }

    // テープID
    reqParam.tapeID = printParameter.tape;

    // 印刷設定優先
    if (printParameter.priorityPrintSetting) {
        reqParam.priorityCutSetting = 2;   // 印刷設定優先
    }
    else {
        reqParam.priorityCutSetting = 1;   // テープカットリッジの印刷設定
    }

    // ハーフカット連続
    if (printParameter.halfCutContinuous) {
        reqParam.halfCutSeparate = 2;      // ハーフカット連続で切り離したラベルを作る
    }
    else {
        reqParam.halfCutSeparate = 1;      // ハーフカット連続でつながったラベルを作る
    }

    // 左右余白
    reqParam.marginLeftRight = printParameter.marginLeftRight;
      
    // テープ幅確認メッセージ表示
    if (printParameter.displayTapeWidth) {
        reqParam.displayTapeWidth = 2; // メッセージを表示する
    }
    else {
        reqParam.displayTapeWidth = 1; // メッセージを表示しない
    }
        
    // エラー表示
    reqParam.errorMessage = {
        mode: 0,
        fileOutput: 0,
        filePath: ""
    };
    if (printParameter.displayError) {
        reqParam.errorMessage.mode = 2;
    }
    else {
        reqParam.errorMessage.mode = 1;
    }
     
    // 印刷設定確認メッセージ表示
    if (printParameter.displayPrintSetting) {
        reqParam.displayTransferTape = 2;  // メッセージを表示する
        reqParam.displayPrintSetting = 2;
    }
    else {
        reqParam.displayTransferTape = 1;  // メッセージを表示しない
        reqParam.displayPrintSetting = 1;
    }
        
    // CSVファイル１行目レコードの読み飛ばし
    if (printParameter.skipRecord) {
        reqParam.cutTitle = 1;     // タイトル行をスキップする
    }
    else {
        reqParam.cutTitle = 0;     // タイトル行をスキップしない
    }

    // CSVデータの半角→全角カタカナ変換
    if (printParameter.convertFullWidth) {
        reqParam.kanaZen = 1;  // 変換する
    }
    else {
        reqParam.kanaZen = 0;  // 変換しない
    }

    // プレビュー表示
    if (printParameter.previewImage) {
        reqParam.displayPrintPreview = 2;
    }
    else {
        reqParam.displayPrintPreview = 1;
    }

    // 画像拡大縮小
    if (printParameter.stretchImage) {
        reqParam.stretchImage = 1;
    }
    else {
        reqParam.stretchImage = 0;
    }

    result.requestPrintParameter = reqParam;

    return result;
}

/**
 * 印刷
 * @param {string} printerName - プリンタ名
 * @param {PrintParameter} printParameter - 印刷パラメータ
 * @param {PrintFile} printFile - 印刷ファイル
 * @returns {object} errorCode と printJob オブジェクト
 */
async function tepraprint_doPrint_Async(printerName, printParameter, printFile) {
    "use strict";

    let webApiPrintParam = {};    // WebAPIに渡す PrintParameter

    if (!printParameter || !printFile) {
        const result = {
            errorCode: TepraPrintError.INVALID_PARAMETER
        }
        return result;
    }

    // WebAPIのPrintParameterの取得
    {
        const result = tepraprint_getWebApiPrintParameter(printParameter);
        if (result.errorCode != TepraPrintError.SUCCESS) {
            return result;
        }

        webApiPrintParam = result.requestPrintParameter;
    }

    // ファイル情報
    let reqPrintFile = {};
    if (printFile.templateFile) {
        reqPrintFile.templateFile = await tepraprint_fileToWebAPIReqFile_Async(printFile.templateFile);
    }

    if (printFile.csvFile) {
        reqPrintFile.csvFile = await tepraprint_fileToWebAPIReqFile_Async(printFile.csvFile);
    }

    if (printFile.imageFile) {
        reqPrintFile.imageFile = await tepraprint_fileToWebAPIReqFile_Async(printFile.imageFile);
    }

    // WebAPIのリクエストボディ
    const requestBody = {
        printFile: reqPrintFile,
        printParameter: webApiPrintParam
    }

    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/print/${encodeURIComponent(printerName)}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const resBody = await response.json();

            if (resBody.result === 1) {
                // 印刷成功なのでPrintJob オブジェクト生成
                const printJob = tepraprint_createPrintJob(printerName, resBody.jobid);

                const result = {
                    errorCode: TepraPrintError.SUCCESS,
                    printJob: printJob
                }

                return result;
            }
            else {
                // 印刷開始失敗
                const result = {
                    errorCode: TepraPrintError.PRINT_START_ERROR
                }
                return result;
            }
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                if (response.status === 400) {
                    result.errorCode = TepraPrintError.INVALID_PARAMETER;
                }
                else {
                    result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }

            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }

        return result;
    }
}

/**
 * 自動選択のプリンタ名を取得
 * @returns errorCodeとprinterName
 */
async function tepraprint_getAutoSelectPrinter_Async() {
    "use strict";

    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/autoselect`);

        if (response.ok) {
            const resBody = await response.json();
            const result = {
                errorCode: TepraPrintError.SUCCESS,
                printerName: resBody.printerName
            }
            return result;
        }
        else {
            const resBody = await response.json();
            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
            }
            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }
        return result;
    }
}

/**
 * Printer テープ送り/テープ送りカットの実行
 * @param {string} printerName - プリンタ名
 * @param {boolean} cutFlag- true:テープ送りカット, false:テープ送り
 * @returns {object} errorCode: <エラーコード>
*/
async function tepraprint_doTapeFeedCut_Async(printerName, cutFlag)
{
    try {
        const response = await fetch(`${tepraprint_uri}/tapefeed/${encodeURIComponent(printerName)}?cutflag=${cutFlag}`);
        if (response.ok) {
            const result = {
                errorCode: TepraPrintError.SUCCESS
            }
            return result;
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
            }

            return result;
        }
    }
    catch{
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }
        return result;
    }
}

/**
 * 印刷ジョブオブジェクトの作成
 * @param {string} printerName プリンタ名
 * @param {number} jobid 印刷ジョブID
 * @returns {PrintJob} PrintJobオブジェクト
 */
function tepraprint_createPrintJob(printerName, jobid) {
    /** @type {PrintJob} */
    const printJob = {
        printerName: printerName,
        jobId: jobid,

        progressOfPrint: async function() {
            return await tepraprint_getJobProgress_Async(this.printerName, this.jobId);
        },

        cancelPrint: async function() {
            return await tepraprint_printJobContrl_Async(this.printerName, this.jobId, 3);
        },

        resumeOfPrint: async function() {
            return await tepraprint_printJobContrl_Async(this.printerName, this.jobId, 2);
        },
       
        pauseOfPrint: async function() {
            return await tepraprint_printJobContrl_Async(this.printerName, this.jobId, 1);
        },
        
        isPaused: async function() {
            const statusResult = await tepraprint_getPrintJobStatus_Async(this.printerName, this.jobId);
            if (statusResult.errorCode == TepraPrintError.SUCCESS) {
                const JOB_STATUS_PAUSED = 0x00000001;

                let isPaused;

                if ((statusResult.status & JOB_STATUS_PAUSED) != 0) {
                    isPaused = true;
                }
                else {
                    isPaused = false;
                }

                const result = {
                    errorCode: TepraPrintError.SUCCESS,
                    isPaused: isPaused,
                }
                
                return result;
            }
            else {
                return statusResult;
            }
        },
    };

    return printJob;
 }

/**
 * 印刷ジョブのデータ送信進捗情報を取得
 * @param {string} printerName プリンタ名
 * @param {number} jobId 印刷ジョブID
 * @returns {{errorCode: number, progress: number, pageNumber: number, totalPageCount: number, jobEnd: boolean, canceled: boolean, statusError: number}}
 */
async function tepraprint_getJobProgress_Async(printerName, jobId) {
    "use strict";

    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/job/progress/${encodeURIComponent(printerName)}?jobid=${jobId}`);

        if (response.ok) {
            const resBody = await response.json();

            try {
                const result = {
                    errorCode: TepraPrintError.SUCCESS,
                    progress: Number(resBody.dataProgress),
                    pageNumber: Number(resBody.pageNumber),
                    totalPageCount: Number(resBody.totalPageCount),
                    jobEnd: Boolean(resBody.jobEnd),
                    canceled: Boolean(resBody.canceled),
                    statusError: Number(resBody.statusError),
                };
                
                return result;
            }
            catch {
                const result = {
                    errorCode: TepraPrintError.WEBAPI_INTERNAL_ERROR
                }

                return result;
            }
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
            }

            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }

        return result;
    }
}

/**
 * 流し込み枠の取得の実行
 * @param {File} templateFile - テンプレートファイル
 * @returns {object} errorCode: <エラーコード>
*/
async function tepraprint_getImportFrame_Async(templateFile)
{
    "use strict";
    
    // WebAPIのリクエストボディ
    const reqFile = await tepraprint_fileToWebAPIReqFile_Async(templateFile);
    const requestBody = {
        templateFile: reqFile
    }

    try {
        const response = await fetch(`${tepraprint_uri}/template/importframe`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const resBody = await response.json();

            const result = {
                errorCode: TepraPrintError.SUCCESS,
                importFrame: resBody
            }
            return result;
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                if (response.status === 400) {
                    result.errorCode = TepraPrintError.INVALID_PARAMETER;
                }
                else {
                    result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }

            return result;
        }
    }
    catch{
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }
        return result;
    }
}

/**
 * 印刷ジョブ操作
 * @param {string} printerName - プリンタ名
 * @param {number} jobId - 印刷ジョブID
 * @param {number} control - 制御コード（1:Pause、2:Resume、3:Cancel）
 * @returns {{errorCode: number}}
 */
async function tepraprint_printJobContrl_Async(printerName, jobId, control) {
    "use strict";

    // WebAPIのリクエストボディ
    const requestBody = {
        jobid: jobId,
        control: control,
    };
    
    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/job/control/${encodeURIComponent(printerName)}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const result = {
                errorCode: TepraPrintError.SUCCESS
            };

            return result;
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                if (response.status === 400) {
                    result.errorCode = TepraPrintError.INVALID_PARAMETER;
                }
                else {
                    result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }

            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }

        return result;
    }
}

/**
 * 印刷ジョブのステータス取得
 * @param {string} printerName - プリンタ名
 * @param {number} jobId - 印刷ジョブID
 * @returns {{errorCode: number, status: number}}
 */
async function tepraprint_getPrintJobStatus_Async(printerName, jobId) {
    "use strict";

    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/job/info/${encodeURIComponent(printerName)}?jobid=${jobId}`);

        if (response.ok) {
            const resBody = await response.json();

            const result = {
                errorCode: TepraPrintError.SUCCESS,
                status: resBody.status,
            };

            return result;
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
            }

            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }

        return result;
    }
}

/**
 * 上余白と下余白と左右余白を取得
 * @param {string} printerName - プリンタ名
 * @param {number} tape - テープID
 * @param {File} templateFile - テンプレートファイル
 * @returns {{errorCode: number, marginTop: number, marginBottom: number}}
 */
async function tepraprint_getMargin_Async(printerName, tape, templateFile) {
    "use strict";

    const requestBody = {
        tapeID: tape
    };

    if (templateFile) {
        const reqFile = await tepraprint_fileToWebAPIReqFile_Async(templateFile);
        if (!reqFile)
        {
            const result = {
                errorCode: TepraPrintError.INVALID_PARAMETER
            }
    
            return result;
        }

        requestBody.templateFile = reqFile;
    }
    else {
        requestBody.templateFile = null;
    }

    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/getmargin/${encodeURIComponent(printerName)}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const resBody = await response.json();

            const result = {
                errorCode: TepraPrintError.SUCCESS,
                marginTop: resBody.top,
                marginBottom: resBody.bottom,
                marginLeftRight: resBody.leftRight
            };

            return result;
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                if (response.status === 400) {
                    result.errorCode = TepraPrintError.INVALID_PARAMETER;
                }
                else {
                    result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
                }
            }

            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }

        return result;
    }
}

/**
 * プリンターステータスの取得
 * @returns {{errorCode: number, status: Status}}
 */
async function tepraprint_fetchPrinterStatus_Async(printerName) {
    "use strict";

    // WebAPIコール
    try {
        const response = await fetch(`${tepraprint_uri}/lwstatus/${encodeURIComponent(printerName)}`);

        if (response.ok) {
            const resBody = await response.json();

            try {
                const status = {
                    tapeWidthFromStatus: resBody.tapeID,
                    tapeKindFromStatus: resBody.tapeKind,
                    deviceErrorFromStatus: resBody.error
                }

                // LW_STATUS.BrTapeKind の値によってはテープ種類を変更
                switch (resBody.brTapeKind) {
                    case 1:
                        status.tapeKindFromStatus = TepraPrintTapeKind.BR_PET;
                        break;
                    default:
                        break;
                }

                // 結果が未定義でないかチェック
                let found = false;
                for (let key in TepraPrintTapeKind) {
                    let value = TepraPrintTapeKind[key]
                    if (status.tapeKindFromStatus === value) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    status.tapeKindFromStatus = TepraPrintTapeKind.UNKNOWN;
                }

                // エラーが発生していない場合、LW_STATUS.Status の値によってはエラーとしてセット
                if (status.deviceErrorFromStatus === TepraPrintStatusError.NO_ERROR)
                {
                    switch (resBody.status) {
                        case 0x13:
                            status.deviceErrorFromStatus = TepraPrintStatusError.FIRMWARE_UPDATING;
                            break;
                        case 0x12:
                            status.deviceErrorFromStatus = TepraPrintStatusError.DEVICE_USING;
                            break;
                        default:
                            break;
                    }
                }

                // 結果が未定義でないかチェック
                found = false;
                for (let key in TepraPrintStatusError) {
                    let value = TepraPrintStatusError[key]
                    if (status.deviceErrorFromStatus === value) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    status.deviceErrorFromStatus = TepraPrintStatusError.UNKNOWN_ERROR;
                }

                // TapeSwitchとTapeOptionはステータスタイプ5以上の機種のみ有効
                if (5 <= resBody.statusType)
                {
                    if (resBody.tapeSw != null) {
                        const TapeSwitch = {
                            magnet: 0, // マグネット（0: 非マグネット / 1: マグネット)
                            bigroll: 0 // EXロングテープ（0: 非EXロングテープ / 1: EXロングテープ）
                        }
    
                        // 対象のbitが立っているか
                        if ((resBody.tapeSw >> 5 & 1) === 1) // 5:マグネット
                            TapeSwitch.magnet = 1;
                        if ((resBody.tapeSw >> 4 & 1) === 1) // 4:EXロングテープ
                            TapeSwitch.bigroll = 1;

                        status.tapeSwitchFromStatus = TapeSwitch;   
                    }

                    if (resBody.t8Option != null) {
                        const TapeOption = {
                            fullCut: 0, // フルカット（0: 許可 / 1: 禁止）
                            halfCut: 0, // ハーフカット（0: 許可 / 1: 禁止）
                            density: 0, // 印刷濃度（0: 通常 / 1:+3）
                            printSpeed: 0, // 印刷速度（0: 高速 / 1: 低速 / 2: 中速）
                            mirror: 0, // 鏡文字（0: 正像 / 1: 鏡像）
                            winder: 0 // 巻き戻し（0: 許可 / 1: 禁止）
                        }
    
                        // 対象のbitが立っているか
                        if ((resBody.t8Option >> 0 & 1) === 1) // 0:巻き戻し
                            TapeOption.winder = 1;
                        if ((resBody.t8Option >> 1 & 1) === 1) // 1:鏡文字
                            TapeOption.mirror = 1;
                        if ((resBody.t8Option >> 3 & 1) === 1) // 3:濃度
                            TapeOption.density = 1;
                        if ((resBody.t8Option >> 4 & 1) === 1) // 4:ハーフカット
                            TapeOption.halfCut = 1;
                        if ((resBody.t8Option >> 5 & 1) === 1) // 5:フルカット
                            TapeOption.fullCut = 1;
                        // 印刷速度
                        if ((resBody.t8Option >> 2 & 1) === 1) // 2:低速
                            TapeOption.printSpeed = 1;
                        else if ((resBody.t8Option >> 6 & 1) === 1) // 6:中速
                            TapeOption.printSpeed = 2;

                        status.tapeOptionFromStatus = TapeOption;
                    }
                }

                const printerStatus = {
                    errorCode: TepraPrintError.SUCCESS,
                    status: status
                }
                
                return printerStatus;
            }
            catch {
                const result = {
                    errorCode: TepraPrintError.WEBAPI_INTERNAL_ERROR
                }

                return result;
            }
        }
        else {
            const resBody = await response.json();

            const result = {};
            if (resBody.hasOwnProperty("errcode")) {
                result.errorCode = resBody.errcode;
            }
            else {
                result.errorCode = TepraPrintError.WEBAPI_INTERNAL_ERROR;
            }

            return result;
        }
    }
    catch {
        const result = {
            errorCode: TepraPrintError.WEBAPI_REQUEST_ERROR
        }

        return result;
    }
        
}

/**
 * Fileオブジェクトからbase64文字列を取得
 * @param {File} file 
 * @returns {string} base64文字列。エラーならnull
 */
async function tepraprint_fileToBase64_Async(file) {
    "use strict";

    const promise = new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        }
        reader.onerror = reject;
        reader.readAsDataURL(file);
    }).then((data) => {
        if (typeof data === "string") {
            if (data.startsWith("data:")) {
                const index = data.indexOf("base64,");
                const base64Str = data.slice(index + 7);
                return base64Str;
            }
        }
        return null;
    }).catch(() => {
        return null;
    });

    return promise;
}

/**
 * FileオブジェクトからWebAPIリクエスト用のファイルオブジェクトを取得
 * @param {File} file - ファイルオブジェクト
 * @returns {{fileName: string, base64Str: string}}
 */
async function tepraprint_fileToWebAPIReqFile_Async(file) {
    "use strict";

    const reqFile = {};

    if (file) {
        reqFile.fileName = file.name;
        reqFile.base64Str = await tepraprint_fileToBase64_Async(file);

        if (!reqFile.base64Str) {
            return null;
        }
    }

    return reqFile;
}
