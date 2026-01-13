declare module 'jspdf' {
    export default class jsPDF {
        constructor(options?: any);
        setFontSize(size: number): void;
        setTextColor(ch1: number | string, ch2?: number, ch3?: number, ch4?: number): void;
        text(text: string | string[], x: number, y: number, options?: any): void;
        setFont(fontName: string, fontStyle?: string): void;
        setLineWidth(width: number): void;
        line(x1: number, y1: number, x2: number, y2: number): void;
        save(filename: string): void;
        internal: {
            pageSize: {
                getHeight(): number;
                getWidth(): number;
            };
        };
    }
}

declare module 'jspdf-autotable' {
    import jsPDF from 'jspdf';
    export default function autoTable(doc: jsPDF, options: any): void;
}
