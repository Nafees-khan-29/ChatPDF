declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }

  function pdf(buffer: Buffer, options?: any): Promise<PDFData>;
  export = pdf;
}
