type TepraPrintParameter = {
  copies: number;
  tapeCut: number;
  halfCut: boolean;
  printSpeed: number;
  density: number;
  tape: number;
  priorityPrintSetting: boolean;
  halfCutContinuous: boolean;
  marginLeftRight: number;
  displayTapeWidth: boolean;
  displayError: boolean;
  displayPrintSetting: boolean;
  skipRecord: boolean;
  previewImage: boolean;
  convertFullWidth: boolean;
  stretchImage: boolean;
};

type TepraPrintFile = {
  templateFile?: File;
  csvFile?: File;
  imageFile?: File;
};

type TepraPrintJobProgress = {
  errorCode: number;
  progress: number;
  pageNumber: number;
  totalPageCount: number;
  jobEnd: boolean;
  canceled: boolean;
  statusError: number;
};

type TepraPrintJob = {
  jobId: number;
  progressOfPrint: () => Promise<TepraPrintJobProgress>;
};

type TepraPrintPrinter = {
  createPrintParameter: () => Promise<{
    errorCode: number;
    printParameter: TepraPrintParameter;
  }>;
  doPrint: (
    printParameter: TepraPrintParameter,
    printFile: TepraPrintFile
  ) => Promise<{
    errorCode: number;
    printJob: TepraPrintJob;
  }>;
};

type TepraPrintApi = {
  getPrinter: () => Promise<{
    errorCode: number;
    printers: string[];
  }>;
  createPrinter: (
    printerName?: string | null
  ) => Promise<{
    errorCode: number;
    printer: TepraPrintPrinter;
  }>;
};

declare const TepraPrint: TepraPrintApi;

declare const TepraPrintError: {
  SUCCESS: number;
};

declare const TepraPrintStatusError: {
  NO_ERROR: number;
};
